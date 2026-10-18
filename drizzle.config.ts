import { defineConfig } from "drizzle-kit";

// drizzle-kit runs outside Next, so load .env.local ourselves (Node's built-in loader, no dotenv).
try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local (e.g. CI with DATABASE_URL already exported) — fall through to the check below.
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

export default defineConfig({
  out: "./drizzle",
  schema: "./src/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
