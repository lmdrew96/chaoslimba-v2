import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

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
