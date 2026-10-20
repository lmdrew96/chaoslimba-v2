import { getDb } from "@/db";
import { getGardenPlantIds } from "@/db/garden";
import { gradeFindings, gradings } from "@/db/schema";
import { gradeAnswer, type GradeResult } from "@/lib/grader";
import { GRADER_EFFORT, GRADER_MODEL } from "@/lib/models";
import type { PlantId } from "@/lib/taxonomy";

type GradeAndStoreInput = {
  userId: string;
  answer: string;
  context?: string;
  targetPlantId?: PlantId;
  conversationId?: string;
};

/**
 * Grade one learner answer and save the grading with every finding. This is
 * the only path that writes to the Error Garden.
 */
export const gradeAndStore = async (
  input: GradeAndStoreInput,
): Promise<{ gradingId: string; result: GradeResult }> => {
  const { userId, answer, context, targetPlantId, conversationId } = input;
  const gardenPlantIds = await getGardenPlantIds(userId);
  const result = await gradeAnswer({ answer, context, gardenPlantIds, targetPlantId });

  const db = getDb();
  const gradingId = crypto.randomUUID();
  const findings = [
    ...result.errors.map((e) => ({
      gradingId,
      userId,
      kind: "error" as const,
      plantId: e.plantId,
      span: e.span,
      correction: e.correction,
      explanation: e.explanation,
      confidence: e.confidence,
      isMaybe: e.isMaybe,
      beautifulMistake: e.beautifulMistake,
    })),
    ...result.correctUses.map((c) => ({
      gradingId,
      userId,
      kind: "correct_use" as const,
      plantId: c.plantId,
      span: c.span,
      confidence: c.confidence,
      isMaybe: c.isMaybe,
    })),
    ...result.polishNotes.map((p) => ({
      gradingId,
      userId,
      kind: "polish" as const,
      span: p.span,
      suggestion: p.suggestion,
      explanation: p.explanation,
    })),
  ];

  // neon-http has no interactive transactions; a batch runs as one, so a grading never lands half-saved.
  const insertGrading = db.insert(gradings).values({
    id: gradingId,
    userId,
    answer,
    context: context || null,
    targetPlantId: targetPlantId ?? null,
    conversationId: conversationId ?? null,
    model: GRADER_MODEL,
    effort: GRADER_EFFORT,
    rawOutput: result.raw,
  });
  if (findings.length > 0) {
    await db.batch([insertGrading, db.insert(gradeFindings).values(findings)]);
  } else {
    await insertGrading;
  }
  return { gradingId, result };
};
