import { asc, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { getGarden } from "@/db/garden";
import { toChatMessage, type ChatConversation } from "@/db/conversations";
import { conversationMessages, conversations } from "@/db/schema";
import { isRateLimited, requireUser } from "@/lib/auth";
import { pickTarget } from "@/lib/garden";
import { TEXT_PLANT_IDS } from "@/lib/grader";
import { isPlantId, type PlantId } from "@/lib/taxonomy";
import { TutorIncompleteError, tutorReply } from "@/lib/tutor";

const fail = (message: string, status = 400) => Response.json({ error: message }, { status });

/** The learner's latest conversation, so a reload picks up where they were. */
export async function GET(req: Request): Promise<Response> {
  try {
    const user = await requireUser(req);
    if (!user) return fail("Sign in to chat with the tutor.", 401);
    const db = getDb();
    const [latest] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, user.id))
      .orderBy(desc(conversations.createdAt))
      .limit(1);
    if (!latest) return Response.json({ conversation: null });
    const messages = await db
      .select()
      .from(conversationMessages)
      .where(eq(conversationMessages.conversationId, latest.id))
      .orderBy(asc(conversationMessages.createdAt));
    const conversation: ChatConversation = {
      id: latest.id,
      targetPlantId: latest.targetPlantId,
      messages: messages.map(toChatMessage),
    };
    return Response.json({ conversation });
  } catch (err) {
    console.error("[tutor] load failed", err);
    return fail("Couldn't load your conversation. Try again in a moment.", 500);
  }
}

/** Start a new conversation. The garden picks the target unless the learner chose one. */
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

    const chosen = body.targetPlantId == null || body.targetPlantId === "" ? undefined : String(body.targetPlantId);
    if (chosen !== undefined && (!isPlantId(chosen) || !TEXT_PLANT_IDS.includes(chosen))) {
      return fail(`Unknown plant: ${chosen}`);
    }
    if (await isRateLimited("tutor:user", user.id, 60, 600)) {
      return fail("That's a lot of chatting at once. Wait a few minutes and try again.", 429);
    }

    const garden = await getGarden(user.id);
    const targetPlantId = (chosen as PlantId | undefined) ?? pickTarget(garden, TEXT_PLANT_IDS);
    const opening = await tutorReply({ history: [], targetPlantId, garden });

    const db = getDb();
    const conversationId = crypto.randomUUID();
    const [, [message]] = await db.batch([
      db.insert(conversations).values({ id: conversationId, userId: user.id, targetPlantId }),
      db
        .insert(conversationMessages)
        .values({ conversationId, role: "tutor", content: opening })
        .returning(),
    ]);
    const conversation: ChatConversation = {
      id: conversationId,
      targetPlantId,
      messages: [toChatMessage(message)],
    };
    return Response.json({ conversation });
  } catch (err) {
    if (err instanceof TutorIncompleteError) {
      console.error("[tutor] incomplete", err.reason, err.message);
      return fail(`${err.message} Try starting again.`, 422);
    }
    console.error("[tutor] start failed", err);
    return fail("Something went wrong on our end. Try again in a moment.", 500);
  }
}
