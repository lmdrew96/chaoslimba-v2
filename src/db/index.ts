import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

let db: NeonHttpDatabase<typeof schema> | undefined;

/**
 * Lazy so a missing DATABASE_URL fails the request that needs it, not the
 * build. neon-http is plain fetch, so one client is safe to reuse.
 */
export const getDb = (): NeonHttpDatabase<typeof schema> => {
  if (db) return db;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  db = drizzle(neon(url), { schema });
  return db;
};
