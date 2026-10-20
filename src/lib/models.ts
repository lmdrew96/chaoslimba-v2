// One constant per AI role. Swap a model here, then rerun the gold set.
// IDs checked against Anthropic's model list, 2026-10-17.

/** Grades learner Romanian and is the only writer to the Error Garden. Also grades intake. */
export const GRADER_MODEL = "claude-sonnet-5-5";

/** Grader thinking depth. Part of the grader config: changing it means rerunning the gold set. */
export const GRADER_EFFORT = "medium";

/** Conversation partner. Reads the garden, never grades. Also runs the intake chat. */
export const TUTOR_MODEL = "claude-haiku-5-5";

/** Tutor thinking depth. Low keeps chat replies quick; it converses, it doesn't judge. */
export const TUTOR_EFFORT = "low";
