// One constant per AI role. Swap a model here, then rerun the gold set.
// IDs checked against Anthropic's model list, 2026-10-17.

/** Grades learner Romanian and is the only writer to the Error Garden. Also grades intake. */
export const GRADER_MODEL = "claude-sonnet-5-5";

/** Conversation partner. Reads the garden, never grades. Also runs the intake chat. */
export const TUTOR_MODEL = "claude-haiku-5-5";
