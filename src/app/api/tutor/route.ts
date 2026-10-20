import { and, asc, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { toChatConversation } from "@/db/conversations";
import { getGarden } from "@/db/garden";
import { conversationMessages, conversations } from "@/db/schema";
import { isRateLimited, requireUser } from "@/lib/auth";
import { pickTarget } from "@/lib/garden";
import { TEXT_PLANT_IDS } from "@/lib/grader";
import { INTAKE_OPENING_NOTE, intakeProbe } from "@/lib/intake";
import { isPlantId, type PlantId } from "@/lib/taxonomy";
import { TutorIncompleteError, tutorReply } from "@/lib/tutor";

const fail = (message: string, status = 400) => Response.json({ error: message }, { status });

const parseKind = (value: unknown): "practice" | "intake" => (value === "intake" ? "intake" : "practice");

/** The learner's latest conversation of a kind (?kind=intake), so a reload picks up where they were. */
export async function GET(req: Request): Promise<Response> {
  try {
    const user = await requireUser(req);
    if (!user) return fail("Sign in to chat with the tutor.", 401);
    const kind = parseKind(new URL(req.url).searchParams.get("kind"));
    const db = getDb();
    const [latest] = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.userId, user.id), eq(conversations.kind, kind)))
      .orderBy(desc(conversations.createdAt))
      .limit(1);
    if (!latest) return Response.json({ conversation: null });
    const messages = await db
      .select()
      .from(conversationMessages)
      .where(eq(conversationMessages.conversationId, latest.id))
      .orderBy(asc(conversationMessages.createdAt));
    return Response.json({ conversation: toChatConversation(latest, messages) });
  } catch (err) {
    console.error("[tutor] load failed", err);
    return fail("Couldn't load your conversation. Try again in a moment.", 500);
  }
}

/**
 * Start a conversation. Practice: the garden picks the target unless the
 * learner chose one. Intake: the target is the first probe.
 */
export async function POST(req: Request): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return fail("Malformed request body.");
  }

  try {
    const user = await requireUser(req);
    if (!user) return fail("Sign in to chat with the tutor.", 401);

    const kind = parseKind(body.kind);
    const chosen = body.targetPlantId == null || body.targetPlantId === "" ? undefined : String(body.targetPlantId);
    if (chosen !== undefined && (!isPlantId(chosen) || !TEXT_PLANT_IDS.includes(chosen))) {
      return fail(`Unknown plant: ${chosen}`);
    }
    if (await isRateLimited("tutor:user", user.id, 60, 600)) {
      return fail("That's a lot of chatting at once. Wait a few minutes and try again.", 429);
    }

    const garden = await getGarden(user.id);
    const targetPlantId =
      kind === "intake" ? intakeProbe(0) : ((chosen as PlantId | undefined) ?? pickTarget(garden, TEXT_PLANT_IDS));
    const opening = await tutorReply({
      history: [],
      targetPlantId,
      garden,
      note: kind === "intake" ? INTAKE_OPENING_NOTE : undefined,
    });

    const db = getDb();
    const conversationId = crypto.randomUUID();
    const [[conversation], [message]] = await db.batch([
      db.insert(conversations).values({ id: conversationId, userId: user.id, kind, targetPlantId }).returning(),
      db.insert(conversationMessages).values({ conversationId, role: "tutor", content: opening }).returning(),
    ]);
    return Response.json({ conversation: toChatConversation(conversation, [message]) });
  } catch (err) {
    if (err instanceof TutorIncompleteError) {
      console.error("[tutor] incomplete", err.reason, err.message);
      return fail(`${err.message} Try starting again.`, 422);
    }
    console.error("[tutor] start failed", err);
    return fail("Something went wrong on our end. Try again in a moment.", 500);
  }
}
