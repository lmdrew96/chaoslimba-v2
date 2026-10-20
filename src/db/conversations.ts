import { and, asc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { getGarden } from "@/db/garden";
import { gradeFindings, gradings, type Conversation, type ConversationMessage } from "@/db/schema";
import { pickTarget } from "@/lib/garden";
import { TEXT_PLANT_IDS } from "@/lib/grader";
import type { PlantId } from "@/lib/taxonomy";

/** What the chat UI gets. `graded` is null for tutor turns, false if grading a learner turn failed. */
export type ChatMessage = { id: string; role: "tutor" | "learner"; content: string; graded: boolean | null };
export type ChatConversation = {
  id: string;
  kind: "practice" | "intake";
  targetPlantId: PlantId | null;
  completed: boolean;
  messages: ChatMessage[];
};

export const toChatMessage = (m: ConversationMessage): ChatMessage => ({
  id: m.id,
  role: m.role,
  content: m.content,
  graded: m.role === "learner" ? m.gradingId !== null : null,
});

export const toChatConversation = (c: Conversation, messages: ConversationMessage[]): ChatConversation => ({
  id: c.id,
  kind: c.kind,
  targetPlantId: c.targetPlantId,
  completed: c.completedAt !== null,
  messages: messages.map(toChatMessage),
});

/** One confident finding, with the learner's whole sentence so they can check the receipts. */
export type EvidenceItem = { span: string; correction: string | null; explanation: string | null; answer: string };
export type PlantEvidence = { plantId: PlantId; errors: EvidenceItem[]; correctUses: EvidenceItem[] };
export type IntakeEvidence = {
  /** Plants with at least one confident error: the garden's first seeds. */
  seeds: PlantEvidence[];
  /** Plants used only correctly. Shown, but not planted. */
  solid: PlantEvidence[];
  /** The one seed that glows. Null when intake caught no errors. */
  startHere: PlantId | null;
};

/** What intake saw, built from the stored findings of one conversation ("maybe" grades left out). */
export const getIntakeEvidence = async (userId: string, conversationId: string): Promise<IntakeEvidence> => {
  const rows = await getDb()
    .select({
      plantId: gradeFindings.plantId,
      kind: gradeFindings.kind,
      span: gradeFindings.span,
      correction: gradeFindings.correction,
      explanation: gradeFindings.explanation,
      answer: gradings.answer,
    })
    .from(gradeFindings)
    .innerJoin(gradings, eq(gradings.id, gradeFindings.gradingId))
    .where(
      and(
        eq(gradeFindings.userId, userId),
        eq(gradings.conversationId, conversationId),
        inArray(gradeFindings.kind, ["error", "correct_use"]),
        eq(gradeFindings.isMaybe, false),
      ),
    )
    .orderBy(asc(gradeFindings.createdAt));

  const byPlant = new Map<PlantId, PlantEvidence>();
  for (const r of rows) {
    if (!r.plantId) continue;
    const entry = byPlant.get(r.plantId) ?? { plantId: r.plantId, errors: [], correctUses: [] };
    const item = { span: r.span, correction: r.correction, explanation: r.explanation, answer: r.answer };
    (r.kind === "error" ? entry.errors : entry.correctUses).push(item);
    byPlant.set(r.plantId, entry);
  }
  const all = [...byPlant.values()];
  const seeds = all.filter((p) => p.errors.length > 0);
  const seedIds = new Set(seeds.map((p) => p.plantId));
  const garden = (await getGarden(userId)).filter((p) => seedIds.has(p.plantId));
  return {
    seeds,
    solid: all.filter((p) => p.errors.length === 0),
    startHere: pickTarget(garden, TEXT_PLANT_IDS),
  };
};
