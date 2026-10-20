// The tutor: a conversation partner. It reads the garden to know what to
// steer toward and never grades or writes to it. Grading happens separately,
// on the same learner turn, in the grader.

import { getClient } from "@/lib/anthropic";
import type { PlantHealth } from "@/lib/garden";
import { TUTOR_EFFORT, TUTOR_MODEL } from "@/lib/models";
import { getPlant, type PlantId } from "@/lib/taxonomy";

export type TutorTurn = { role: "tutor" | "learner"; content: string };

export type TutorInput = {
  history: TutorTurn[];
  targetPlantId: PlantId | null;
  garden: PlantHealth[];
  /** Extra instructions for this turn only, such as intake's opening or closing. */
  note?: string;
};

/** The model declined or ran out of room; nothing was said and nothing should be stored. */
export class TutorIncompleteError extends Error {
  constructor(readonly reason: "refusal" | "max_tokens" | "no_output", message: string) {
    super(message);
    this.name = "TutorIncompleteError";
  }
}

/** Only this many recent turns go to the model, so long chats stay fast and cheap. */
const HISTORY_LIMIT = 40;

const KICKOFF =
  "[The learner just opened the chat. Greet them briefly and open with one concrete question whose natural answer uses the target structure.]";

const SYSTEM_PROMPT = `You are a friendly Romanian conversation partner for an English-speaking learner. You chat with them in Romanian about everyday things: their day, plans, food, places, opinions, stories. You are not a teacher giving lessons and you do not grade.

## How you talk
- Write mostly in Romanian, pitched at the learner's level: match the length and complexity of their messages, a little above it. If they're stuck or ask, a short English gloss is fine.
- Keep each reply short: two or three sentences, usually ending with a question that's easy and inviting to answer.
- Be warm and curious about what they say. React to the content, not just the grammar.

## Steering
You'll be given one target structure. Create natural chances for the learner to use it: ask questions whose natural answer needs it. Don't name the structure, don't announce a topic change, and don't quiz. If the conversation drifts, steer back gently a few turns later.

## Corrections
- Correct live only (a) the target structure and (b) anything that stops you from understanding what they meant. Leave every other mistake alone; it's noted elsewhere.
- Prompt before you model. First give the learner a chance to fix it themselves, with a light nudge inside the conversation, e.g. "Hm, *o* proiect?" or "Ieri... am mers sau merg?". Only if they don't fix it, use the right form naturally in your reply.
- Never explain grammar at length, never list mistakes, and never give scores or feedback summaries.
- Never talk about the learner's patterns or history ("I noticed you always...", "you keep forgetting..."). Every turn is a fresh chance.

Reply with just your message to the learner.`;

const contextBlock = (input: TutorInput): string => {
  const parts: string[] = [];
  if (input.targetPlantId) {
    const plant = getPlant(input.targetPlantId);
    const example = plant.example ? ` A typical mistake: "${plant.example.error}" instead of "${plant.example.fix}".` : "";
    parts.push(`Target structure: ${plant.name}. ${plant.description}${example}`);
  } else if (!input.note) {
    parts.push("No target structure yet. Just get them talking, with a mix of past, present and future.");
  }
  const others = input.garden.filter((p) => p.plantId !== input.targetPlantId).map((p) => getPlant(p.plantId).name);
  if (others.length > 0) {
    parts.push(`Other things they're working on (don't correct these live): ${others.join(", ")}.`);
  }
  if (input.note) parts.push(input.note);
  return parts.join("\n");
};

export const tutorReply = async (input: TutorInput): Promise<string> => {
  const recent = input.history.slice(-HISTORY_LIMIT);
  // The API needs the first message to come from the user, so the chat always opens with the kickoff note.
  const messages = [
    { role: "user" as const, content: KICKOFF },
    ...recent.map((t) => ({ role: t.role === "tutor" ? ("assistant" as const) : ("user" as const), content: t.content })),
  ];

  const response = await getClient().messages.create({
    model: TUTOR_MODEL,
    max_tokens: 4000,
    system: [
      { type: "text", text: SYSTEM_PROMPT },
      { type: "text", text: contextBlock(input) },
    ],
    messages,
    output_config: { effort: TUTOR_EFFORT },
  });

  if (response.stop_reason === "refusal") {
    throw new TutorIncompleteError("refusal", "The tutor declined to reply to that.");
  }
  if (response.stop_reason === "max_tokens") {
    throw new TutorIncompleteError("max_tokens", "The tutor ran out of room before finishing.");
  }
  const text = response.content
    .flatMap((b) => (b.type === "text" ? [b.text] : []))
    .join("")
    .trim();
  if (!text) throw new TutorIncompleteError("no_output", "The tutor returned no reply.");
  return text;
};
