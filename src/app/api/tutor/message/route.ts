import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { toChatMessage } from "@/db/conversations";
import { getGarden } from "@/db/garden";
import { gradeAndStore } from "@/db/gradings";
import { conversationMessages, conversations } from "@/db/schema";
import { isRateLimited, requireUser } from "@/lib/auth";
import { TutorIncompleteError, tutorReply } from "@/lib/tutor";

const fail = (message: string, status = 400) => Response.json({ error: message }, { status });

const MAX_MESSAGE_LENGTH = 2000;

/**
 * One learner turn. The message is saved first, then graded and answered in
 * parallel: the tutor never sees the grade, and the chat doesn't wait on it.
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

    const conversationId = String(body.conversationId ?? "");
    const text = String(body.text ?? "").trim();
    if (!text) return fail("Write something first.");
    if (text.length > MAX_MESSAGE_LENGTH) return fail(`Messages can be up to ${MAX_MESSAGE_LENGTH} characters.`);
    if (!/^[0-9a-f-]{36}$/i.test(conversationId)) return fail("Unknown conversation.");

    const db = getDb();
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.id, conversationId), eq(conversations.userId, user.id)))
      .limit(1);
    if (!conversation) return fail("Unknown conversation.", 404);

    if (await isRateLimited("tutor:user", user.id, 60, 600)) {
      return fail("That's a lot of chatting at once. Wait a few minutes and try again.", 429);
    }

    const earlier = await db
      .select()
      .from(conversationMessages)
      .where(eq(conversationMessages.conversationId, conversationId))
      .orderBy(asc(conversationMessages.createdAt));
    const [learnerRow] = await db
      .insert(conversationMessages)
      .values({ conversationId, role: "learner", content: text })
      .returning();

    const lastTutor = [...earlier].reverse().find((m) => m.role === "tutor");
    const targetPlantId = conversation.targetPlantId ?? undefined;
    const history = [...earlier, learnerRow].map((m) => ({ role: m.role, content: m.content }));

    const [grading, reply] = await Promise.allSettled([
      gradeAndStore({ userId: user.id, answer: text, context: lastTutor?.content, targetPlantId, conversationId }),
      getGarden(user.id).then((garden) =>
        tutorReply({ history, targetPlantId: conversation.targetPlantId, garden }),
      ),
    ]);

    let learnerMessage = toChatMessage(learnerRow);
    if (grading.status === "fulfilled") {
      await db
        .update(conversationMessages)
        .set({ gradingId: grading.value.gradingId })
        .where(eq(conversationMessages.id, learnerRow.id));
      learnerMessage = { ...learnerMessage, graded: true };
    } else {
      // The chat goes on; the message is kept, marked ungraded, and the failure logged.
      console.error("[tutor] grading failed", grading.reason);
    }

    if (reply.status === "rejected") {
      const err = reply.reason;
      if (err instanceof TutorIncompleteError) {
        console.error("[tutor] incomplete", err.reason, err.message);
        return Response.json({ learnerMessage, tutorMessage: null, error: `${err.message} Try saying it another way.` }, { status: 422 });
      }
      console.error("[tutor] reply failed", err);
      return Response.json(
        { learnerMessage, tutorMessage: null, error: "The tutor couldn't reply. Your message was saved; try again in a moment." },
        { status: 502 },
      );
    }

    const [tutorRow] = await db
      .insert(conversationMessages)
      .values({ conversationId, role: "tutor", content: reply.value })
      .returning();
    return Response.json({ learnerMessage, tutorMessage: toChatMessage(tutorRow) });
  } catch (err) {
    console.error("[tutor] turn failed", err);
    return fail("Something went wrong on our end. Try again in a moment.", 500);
  }
}
