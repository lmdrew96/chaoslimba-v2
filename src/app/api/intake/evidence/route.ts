import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { getIntakeEvidence } from "@/db/conversations";
import { conversations } from "@/db/schema";
import { requireUser } from "@/lib/auth";

const fail = (message: string, status = 400) => Response.json({ error: message }, { status });

/** What one intake saw: seeds with the learner's own sentences, plus the one to start with. */
export async function GET(req: Request): Promise<Response> {
  try {
    const user = await requireUser(req);
    if (!user) return fail("Sign in to see your results.", 401);
    const conversationId = new URL(req.url).searchParams.get("conversationId") ?? "";
    if (!/^[0-9a-f-]{36}$/i.test(conversationId)) return fail("Unknown conversation.");
    const [conversation] = await getDb()
      .select({ id: conversations.id })
      .from(conversations)
      .where(
        and(eq(conversations.id, conversationId), eq(conversations.userId, user.id), eq(conversations.kind, "intake")),
      )
      .limit(1);
    if (!conversation) return fail("Unknown conversation.", 404);
    return Response.json({ evidence: await getIntakeEvidence(user.id, conversationId) });
  } catch (err) {
    console.error("[intake] evidence failed", err);
    return fail("Couldn't load what intake found. Try again in a moment.", 500);
  }
}
