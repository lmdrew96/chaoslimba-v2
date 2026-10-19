import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
// Relative, not "@/": drizzle-kit loads this file outside Next's path aliases.
import { PLANT_IDS } from "../lib/taxonomy";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Stored normalized (trimmed, lowercased), so the unique constraint is case-insensitive in practice.
  email: text("email").notNull().unique(),
  // PBKDF2 parameters live on the row so the cost can be raised later without breaking old hashes.
  passwordHash: text("password_hash").notNull(), // base64
  passwordSalt: text("password_salt").notNull(), // base64
  passwordIterations: integer("password_iterations").notNull(),
  passwordHashAlgo: text("password_hash_algo").notNull(), // e.g. "SHA-256"
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

// The fixed taxonomy, enforced by the database too: a plant id outside the 22 can't be stored.
export const plantIdEnum = pgEnum("plant_id", PLANT_IDS);

export const findingKindEnum = pgEnum("finding_kind", ["error", "correct_use", "polish"]);

/** One grader call on one learner answer. `rawOutput` is the model's full JSON, kept verbatim. */
export const gradings = pgTable("gradings", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  answer: text("answer").notNull(),
  // The turn the learner was answering, so the grader can judge meaning.
  context: text("context"),
  targetPlantId: plantIdEnum("target_plant_id"),
  model: text("model").notNull(),
  effort: text("effort").notNull(),
  rawOutput: jsonb("raw_output").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * One row per error, correct use or polish note. The garden reads these;
 * only the grader writes them.
 */
export const gradeFindings = pgTable(
  "grade_findings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gradingId: uuid("grading_id")
      .notNull()
      .references(() => gradings.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: findingKindEnum("kind").notNull(),
    // Null only for polish notes, which never belong to a plant.
    plantId: plantIdEnum("plant_id"),
    span: text("span").notNull(),
    correction: text("correction"), // errors
    suggestion: text("suggestion"), // polish notes
    explanation: text("explanation"), // errors and polish notes
    // Model-reported, 0 to 1. Null for polish notes, which carry none.
    confidence: real("confidence"),
    // Below the grader's maybe threshold: shown as "maybe?", never moves plant health.
    isMaybe: boolean("is_maybe").notNull().default(false),
    beautifulMistake: boolean("beautiful_mistake").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("grade_findings_user_plant_idx").on(t.userId, t.plantId)],
);

export type Grading = typeof gradings.$inferSelect;
export type GradeFinding = typeof gradeFindings.$inferSelect;
