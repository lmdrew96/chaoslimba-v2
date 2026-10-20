import type { PlantId } from "./taxonomy";

/**
 * Starting numbers, approved Oct 18. Tune them here; nothing else hardcodes them.
 * A "session" is one tutor conversation. Attempts graded outside one (the
 * grader lab) fall back to runs with no gap longer than `sessionGapMinutes`.
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
export type Attempt = { correct: boolean; at: Date; conversationId: string | null };

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
  const conversations = new Set(attempts.flatMap((a) => (a.conversationId ? [a.conversationId] : [])));
  const loose = attempts.filter((a) => !a.conversationId);
  const gap = GARDEN_RULES.sessionGapMinutes * 60_000;
  let gapSessions = loose.length > 0 ? 1 : 0;
  for (let i = 1; i < loose.length; i++) {
    if (loose[i].at.getTime() - loose[i - 1].at.getTime() > gap) gapSessions++;
  }
  return conversations.size + gapSessions;
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

// Struggling plants first, then ones still gathering data. Thriving plants only when nothing else is left.
const TARGET_ORDER: Record<PlantState, number> = { wilting: 0, sprout: 1, growing: 2, thriving: 3 };

/**
 * The one seed that glows: the plant the tutor steers toward next. Ties go to
 * lower accuracy, then to the plant practiced longest ago. Null for an empty
 * garden or one with no plant in `allowed`.
 */
export const pickTarget = (garden: PlantHealth[], allowed: readonly PlantId[]): PlantId | null => {
  const candidates = garden.filter((p) => allowed.includes(p.plantId));
  candidates.sort(
    (a, b) =>
      TARGET_ORDER[a.state] - TARGET_ORDER[b.state] ||
      (a.accuracy ?? 0) - (b.accuracy ?? 0) ||
      a.lastAttemptAt.localeCompare(b.lastAttemptAt),
  );
  return candidates[0]?.plantId ?? null;
};
