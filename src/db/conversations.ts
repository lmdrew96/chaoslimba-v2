import type { ConversationMessage } from "@/db/schema";
import type { PlantId } from "@/lib/taxonomy";

/** What the chat UI gets. `graded` is null for tutor turns, false if grading a learner turn failed. */
export type ChatMessage = { id: string; role: "tutor" | "learner"; content: string; graded: boolean | null };
export type ChatConversation = { id: string; targetPlantId: PlantId | null; messages: ChatMessage[] };

export const toChatMessage = (m: ConversationMessage): ChatMessage => ({
  id: m.id,
  role: m.role,
  content: m.content,
  graded: m.role === "learner" ? m.gradingId !== null : null,
});
