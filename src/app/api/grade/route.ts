import { and, eq, isNotNull } from "drizzle-orm";
import { getDb } from "@/db";
import { gradeFindings, gradings } from "@/db/schema";
import { isRateLimited, requireUser } from "@/lib/auth";
import { GraderIncompleteError, GraderOutputError, gradeAnswer } from "@/lib/grader";
import { GRADER_EFFORT, GRADER_MODEL } from "@/lib/models";
import { isPlantId, type PlantId } from "@/lib/taxonomy";

const fail = (message: string, status = 400) => Response.json({ error: message }, { status });

const MAX_ANSWER_LENGTH = 2000;
const MAX_CONTEXT_LENGTH = 4000;

export async function POST(req: Request): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return fail("Malformed request body.");
  }

  try {
    return await handle(req, body);
  } catch (err) {
    if (err instanceof GraderIncompleteError) {
      console.error("[grade] incomplete", err.reason, err.message);
      return fail(`${err.message} Nothing was saved. Try rephrasing your answer.`, 422);
    }
    if (err instanceof GraderOutputError) {
      console.error("[grade] invalid output", err.message);
      return fail("The grader returned something it shouldn't have. Nothing was saved. Try again.", 502);
    }
    console.error("[grade] request failed", err);
    return fail("Something went wrong on our end. Try again in a moment.", 500);
  }
}

const handle = async (req: Request, body: Record<string, unknown>): Promise<Response> => {
  const user = await requireUser(req);
  if (!user) return fail("Sign in to use the grader.", 401);

  const answer = String(body.answer ?? "").trim();
  const context = String(body.context ?? "").trim();
  const target = body.targetPlantId == null || body.targetPlantId === "" ? undefined : String(body.targetPlantId);

  if (!answer) return fail("Write an answer in Romanian first.");
  if (answer.length > MAX_ANSWER_LENGTH) {
    return fail(`Answers can be up to ${MAX_ANSWER_LENGTH} characters.`);
  }
  if (context.length > MAX_CONTEXT_LENGTH) {
    return fail(`Context can be up to ${MAX_CONTEXT_LENGTH} characters.`);
  }
  if (target !== undefined && !isPlantId(target)) return fail(`Unknown plant: ${target}`);
  const targetPlantId: PlantId | undefined = target;

  // Each call costs money, so cap it per learner.
  if (await isRateLimited("grade:user", user.id, 30, 600)) {
    return fail("That's a lot of grading at once. Wait a few minutes and try again.", 429);
  }

  const db = getDb();

  // The garden holds a plant once the learner has made a confident error on it.
  const gardenRows = await db
    .selectDistinct({ plantId: gradeFindings.plantId })
    .from(gradeFindings)
    .where(
      and(
        eq(gradeFindings.userId, user.id),
        eq(gradeFindings.kind, "error"),
        eq(gradeFindings.isMaybe, false),
        isNotNull(gradeFindings.plantId),
      ),
    );
  const gardenPlantIds = gardenRows.flatMap((r) => (r.plantId ? [r.plantId] : []));

  const result = await gradeAnswer({ answer, context, gardenPlantIds, targetPlantId });

  const gradingId = crypto.randomUUID();
  const findings = [
    ...result.errors.map((e) => ({
      gradingId,
      userId: user.id,
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
      userId: user.id,
      kind: "correct_use" as const,
      plantId: c.plantId,
      span: c.span,
      confidence: c.confidence,
      isMaybe: c.isMaybe,
    })),
    ...result.polishNotes.map((p) => ({
      gradingId,
      userId: user.id,
      kind: "polish" as const,
      span: p.span,
      suggestion: p.suggestion,
      explanation: p.explanation,
    })),
  ];

  // neon-http has no interactive transactions; a batch runs as one, so a grading never lands half-saved.
  const insertGrading = db.insert(gradings).values({
    id: gradingId,
    userId: user.id,
    answer,
    context: context || null,
    targetPlantId: targetPlantId ?? null,
    model: GRADER_MODEL,
    effort: GRADER_EFFORT,
    rawOutput: result.raw,
  });
  if (findings.length > 0) {
    await db.batch([insertGrading, db.insert(gradeFindings).values(findings)]);
  } else {
    await insertGrading;
  }

  return Response.json({
    gradingId,
    errors: result.errors,
    correctUses: result.correctUses,
    polishNotes: result.polishNotes,
  });
};
