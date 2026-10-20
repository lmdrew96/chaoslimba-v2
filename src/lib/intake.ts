import type { PlantId } from "./taxonomy";

/**
 * Intake is the tutor's first conversation, steered through fixed probes so
 * the first garden isn't guessed from whatever came up. Easy to hard; each
 * probe gets `turnsPerProbe` learner turns.
 */
export const INTAKE = {
  probes: ["present-conjugation", "definite-article", "perfect-compus", "conjunctiv"] as const satisfies readonly PlantId[],
  turnsPerProbe: 2,
};

/** The probe the tutor steers toward after `learnerTurns` learner turns, or null once intake is done. */
export const intakeProbe = (learnerTurns: number): PlantId | null =>
  INTAKE.probes[Math.floor(learnerTurns / INTAKE.turnsPerProbe)] ?? null;

export const INTAKE_OPENING_NOTE =
  "This is the learner's very first conversation. Introduce yourself in one short line, then ask your first question. Keep it easy; you don't know their level yet.";

export const INTAKE_CLOSING_NOTE =
  "This is the last message of the learner's first conversation. Reply warmly to what they said, thank them, and tell them (in Romanian, with a short English gloss) that their garden is ready to look at. Don't ask a question.";
