import {
  clearRateLimit,
  clearedCookie,
  clientIp,
  createSession,
  createUser,
  destroySession,
  getUserByEmail,
  isRateLimited,
  isValidEmail,
  MIN_PASSWORD_LENGTH,
  normalizeEmail,
  publicAccount,
  readCookie,
  requireUser,
  SESSION_COOKIE,
  sessionCookie,
  verifyPassword,
} from "@/lib/auth";

const json = (body: unknown, init?: ResponseInit) => Response.json(body, init);
const fail = (message: string, status = 400) => Response.json({ error: message }, { status });

/** Never reveal whether an email exists — same message for both failure modes. */
const BAD_CREDENTIALS = "Email or password is incorrect.";

export async function POST(req: Request): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return fail("Malformed request body.");
  }

  try {
    return await handle(req, body);
  } catch (err) {
    console.error("[auth] request failed", err);
    return fail("Something went wrong on our end. Try again in a moment.", 500);
  }
}

const handle = async (req: Request, body: Record<string, unknown>): Promise<Response> => {
  const action = String(body.action ?? "");
  const ip = clientIp(req);

  // ── me ─────────────────────────────────────────────────────────────────────
  if (action === "me") {
    const user = await requireUser(req);
    return json({ account: user ? publicAccount(user) : null });
  }

  // ── logout ─────────────────────────────────────────────────────────────────
  if (action === "logout") {
    await destroySession(readCookie(req, SESSION_COOKIE));
    return json({ ok: true }, { headers: { "Set-Cookie": clearedCookie() } });
  }

  // ── signup / login ─────────────────────────────────────────────────────────
  if (action !== "signup" && action !== "login") return fail(`Unknown action: ${action}`);

  const email = normalizeEmail(String(body.email ?? ""));
  const password = String(body.password ?? "");

  if (!isValidEmail(email)) return fail("That doesn't look like an email address.");

  // Throttle by IP for both actions, and additionally by email on login.
  if (await isRateLimited(`${action}:ip`, ip, action === "signup" ? 5 : 20, 900)) {
    return fail("Too many attempts. Wait 15 minutes and try again.", 429);
  }

  if (action === "signup") {
    if (password.length < MIN_PASSWORD_LENGTH) {
      return fail(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
    }
    // Signup is not a credential oracle worth protecting here, and a vague
    // error would just strand the user, so say plainly that the email is taken.
    const taken = "An account with that email already exists. Sign in instead.";
    if (await getUserByEmail(email)) return fail(taken, 409);

    const user = await createUser(email, password);
    if (!user) return fail(taken, 409);

    const sid = await createSession(user.id);
    return json({ account: publicAccount(user) }, { headers: { "Set-Cookie": sessionCookie(sid) } });
  }

  // login
  if (await isRateLimited("login:email", email, 8, 900)) {
    return fail("Too many attempts for this account. Wait 15 minutes and try again.", 429);
  }
  const user = await getUserByEmail(email);
  if (!user) return fail(BAD_CREDENTIALS, 401);
  if (!(await verifyPassword(user, password))) return fail(BAD_CREDENTIALS, 401);

  await clearRateLimit("login:email", email);
  const sid = await createSession(user.id);
  return json({ account: publicAccount(user) }, { headers: { "Set-Cookie": sessionCookie(sid) } });
};
