/**
 * Account auth. Ported from Tangle / Kindling / personal-context-mcp.
 *
 * No third-party auth provider: email plus password, PBKDF2 via Web Crypto,
 * and opaque session ids in Redis behind an httpOnly cookie.
 *
 * The one change from the originals: those apps have no database, so the
 * account record lived in Redis. Here the account is a row in Postgres
 * (`users`), and Redis holds only sessions and rate-limit counters.
 *
 * Workers note: 600k PBKDF2 iterations cost ~60ms of CPU per hash, which
 * needs the Workers Paid plan (Free allows 10ms per request).
 */

import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users, type User } from "@/db/schema";
import { getRedis } from "./redis";

// ── Key space (everything under chaoslimba:) ─────────────────────────────────
const sessionKey = (sid: string) => `chaoslimba:session:${sid}`;
const rateKey = (scope: string, id: string) => `chaoslimba:rl:${scope}:${id}`;

export const SESSION_COOKIE = "chaoslimba_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

/** Stored on the row so the cost can be raised later without breaking old hashes. */
const PBKDF2_ITERATIONS = 600_000;
const PBKDF2_HASH = "SHA-256";
const SALT_BYTES = 16;
const KEY_BYTES = 32;

export const MIN_PASSWORD_LENGTH = 10;

/** The shape safe to hand back to the browser — never the hash or salt. */
export type PublicAccount = { id: string; email: string; createdAt: string };

export const publicAccount = (u: User): PublicAccount => ({
  id: u.id,
  email: u.email,
  createdAt: u.createdAt.toISOString(),
});

// ── Password hashing ─────────────────────────────────────────────────────────

const toB64 = (buf: ArrayBuffer): string => Buffer.from(new Uint8Array(buf)).toString("base64");

const fromB64 = (s: string): Uint8Array => new Uint8Array(Buffer.from(s, "base64"));

const derive = async (
  password: string,
  salt: Uint8Array,
  iterations: number,
  hash: string,
): Promise<ArrayBuffer> => {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  return crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as unknown as BufferSource, iterations, hash },
    keyMaterial,
    KEY_BYTES * 8,
  );
};

type PasswordFields = Pick<
  User,
  "passwordHash" | "passwordSalt" | "passwordIterations" | "passwordHashAlgo"
>;

export const hashPassword = async (password: string): Promise<PasswordFields> => {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const bits = await derive(password, salt, PBKDF2_ITERATIONS, PBKDF2_HASH);
  return {
    passwordHash: toB64(bits),
    passwordSalt: toB64(salt.buffer as ArrayBuffer),
    passwordIterations: PBKDF2_ITERATIONS,
    passwordHashAlgo: PBKDF2_HASH,
  };
};

/** Length-independent compare, so a wrong password can't be timed out character by character. */
const timingSafeEqual = (a: Uint8Array, b: Uint8Array): boolean => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
};

export const verifyPassword = async (user: User, password: string): Promise<boolean> => {
  // Read the cost off the row rather than the constants, so raising the cost
  // later doesn't lock out everyone who signed up before.
  const bits = await derive(
    password,
    fromB64(user.passwordSalt),
    user.passwordIterations,
    user.passwordHashAlgo,
  );
  return timingSafeEqual(new Uint8Array(bits), fromB64(user.passwordHash));
};

// ── Accounts ─────────────────────────────────────────────────────────────────

export const normalizeEmail = (raw: string): string => raw.trim().toLowerCase();

export const isValidEmail = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const getUserByEmail = async (email: string): Promise<User | null> => {
  const rows = await getDb().select().from(users).where(eq(users.email, email)).limit(1);
  return rows[0] ?? null;
};

export const getUserById = async (id: string): Promise<User | null> => {
  const rows = await getDb().select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0] ?? null;
};

/** Returns null when the email is already taken (including a race with another signup). */
export const createUser = async (email: string, password: string): Promise<User | null> => {
  const fields = await hashPassword(password);
  const rows = await getDb()
    .insert(users)
    .values({ email, ...fields })
    .onConflictDoNothing({ target: users.email })
    .returning();
  return rows[0] ?? null;
};

// ── Sessions ─────────────────────────────────────────────────────────────────

const randomB64Url = (bytes: number): string =>
  Buffer.from(crypto.getRandomValues(new Uint8Array(bytes))).toString("base64url");

/** The session maps to the user id, not the email, so an email change can't orphan it. */
export const createSession = async (userId: string): Promise<string> => {
  const sid = randomB64Url(32);
  await getRedis().set(sessionKey(sid), userId, { ex: SESSION_TTL_SECONDS });
  return sid;
};

export const readSession = async (sid: string | undefined): Promise<string | null> => {
  if (!sid) return null;
  return (await getRedis().get<string>(sessionKey(sid))) ?? null;
};

export const destroySession = async (sid: string | undefined): Promise<void> => {
  if (sid) await getRedis().del(sessionKey(sid));
};

export const sessionCookie = (sid: string): string =>
  `${SESSION_COOKIE}=${sid}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${SESSION_TTL_SECONDS}`;

export const clearedCookie = (): string =>
  `${SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;

/** Parsed off the raw header rather than next/headers, so this works in any runtime. */
export const readCookie = (req: Request, name: string): string | undefined => {
  const header = req.headers.get("cookie");
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return v.join("=");
  }
  return undefined;
};

/** Resolve the signed-in user from a request cookie, or null. */
export const requireUser = async (req: Request): Promise<User | null> => {
  const userId = await readSession(readCookie(req, SESSION_COOKIE));
  if (!userId) return null;
  return getUserById(userId);
};

// ── Rate limiting ────────────────────────────────────────────────────────────

/** Hashed so a raw IP or email never becomes a Redis key name. */
const rateId = async (id: string): Promise<string> => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(id));
  return Buffer.from(new Uint8Array(digest)).toString("hex").slice(0, 32);
};

/** Cloudflare sets cf-connecting-ip; the others cover next dev and proxies. */
export const clientIp = (req: Request): string =>
  req.headers.get("cf-connecting-ip") ||
  req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
  req.headers.get("x-real-ip") ||
  "unknown";

/**
 * Fails OPEN. A Redis blip should not lock everyone out of signing in — the
 * cost of that is worse than the cost of an unthrottled window.
 */
export const isRateLimited = async (
  scope: string,
  id: string,
  max: number,
  windowSeconds: number,
): Promise<boolean> => {
  try {
    const redis = getRedis();
    const k = rateKey(scope, await rateId(id));
    const n = await redis.incr(k);
    if (n === 1) {
      await redis.expire(k, windowSeconds);
    } else if ((await redis.ttl(k)) < 0) {
      // INCR created the key but the EXPIRE never landed. Without this repair
      // the counter never resets and the caller is locked out permanently.
      await redis.expire(k, windowSeconds);
    }
    return n > max;
  } catch (err) {
    console.error("[auth] rate limit check failed; allowing request", err);
    return false;
  }
};

export const clearRateLimit = async (scope: string, id: string): Promise<void> => {
  try {
    await getRedis().del(rateKey(scope, await rateId(id)));
  } catch (err) {
    console.error("[auth] rate limit clear failed", err);
  }
};
