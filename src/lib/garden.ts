import type { PlantId } from "./taxonomy";

/**
 * Starting numbers, approved Oct 18. Tune them here; nothing else hardcodes them.
 * A "session" is a run of attempts with no gap longer than `sessionGapMinutes`.
 */
export const GARDEN_RULES = {
  window: 10,
  minAttempts: 5,
  wiltingBelow: 0.6,
  thrivingAt: 0.85,
  thrivingMinSessions: 2,
  dormantAfterDays: 21,
  sessionGapMinutes: 30,
} as const;

export type PlantState = "sprout" | "wilting" | "growing" | "thriving";

/** One confident grader finding on a plant: an error (false) or a correct use (true). */
export type Attempt = { correct: boolean; at: Date };

export type PlantHealth = {
  plantId: PlantId;
  state: PlantState;
  /** Shown faded on top of `state`; the next attempt wakes it. */
  dormant: boolean;
  /** Share right over the window. Null while a sprout, so health stays hidden. */
  accuracy: number | null;
  windowCorrect: number;
  windowAttempts: number;
  totalAttempts: number;
  lastAttemptAt: string;
};

const DAY_MS = 86_400_000;

const countSessions = (attempts: Attempt[]): number => {
  const gap = GARDEN_RULES.sessionGapMinutes * 60_000;
  let sessions = 1;
  for (let i = 1; i < attempts.length; i++) {
    if (attempts[i].at.getTime() - attempts[i - 1].at.getTime() > gap) sessions++;
  }
  return sessions;
};

/**
 * Health of one plant as of `now`, from its confident attempts. Pure: findings
 * are never edited, so passing an earlier `now` (with attempts up to then)
 * rebuilds the plant's past state for a look-back.
 */
export const plantHealth = (plantId: PlantId, attempts: Attempt[], now: Date): PlantHealth => {
  if (attempts.length === 0) throw new Error(`plantHealth needs at least one attempt for ${plantId}`);
  const sorted = [...attempts].sort((a, b) => a.at.getTime() - b.at.getTime());
  const window = sorted.slice(-GARDEN_RULES.window);
  const windowCorrect = window.filter((a) => a.correct).length;
  const last = sorted[sorted.length - 1].at;
  const dormant = now.getTime() - last.getTime() > GARDEN_RULES.dormantAfterDays * DAY_MS;

  const base = {
    plantId,
    dormant,
    windowCorrect,
    windowAttempts: window.length,
    totalAttempts: sorted.length,
    lastAttemptAt: last.toISOString(),
  };

  if (sorted.length < GARDEN_RULES.minAttempts) return { ...base, state: "sprout", accuracy: null };

  const accuracy = windowCorrect / window.length;
  let state: PlantState = "growing";
  if (accuracy < GARDEN_RULES.wiltingBelow) state = "wilting";
  else if (accuracy >= GARDEN_RULES.thrivingAt && countSessions(window) >= GARDEN_RULES.thrivingMinSessions) {
    state = "thriving";
  }
  return { ...base, state, accuracy };
};
