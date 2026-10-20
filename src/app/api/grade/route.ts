import { gradeAndStore } from "@/db/gradings";
import { isRateLimited, requireUser } from "@/lib/auth";
import { GraderIncompleteError, GraderOutputError } from "@/lib/grader";
import { isPlantId, type PlantId } from "@/lib/taxonomy";

const fail = (message: string, status = 400) => Response.json({ error: message }, { status });

const MAX_ANSWER_LENGTH = 2000;
const MAX_CONTEXT_LENGTH = 4000;

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
    if (err instanceof GraderIncompleteError) {
      console.error("[grade] incomplete", err.reason, err.message);
      return fail(`${err.message} Nothing was saved. Try rephrasing your answer.`, 422);
    }
    if (err instanceof GraderOutputError) {
      console.error("[grade] invalid output", err.message);
      return fail("The grader returned something it shouldn't have. Nothing was saved. Try again.", 502);
    }
    console.error("[grade] request failed", err);
    return fail("Something went wrong on our end. Try again in a moment.", 500);
  }
}

const handle = async (req: Request, body: Record<string, unknown>): Promise<Response> => {
  const user = await requireUser(req);
  if (!user) return fail("Sign in to use the grader.", 401);

  const answer = String(body.answer ?? "").trim();
  const context = String(body.context ?? "").trim();
  const target = body.targetPlantId == null || body.targetPlantId === "" ? undefined : String(body.targetPlantId);

  if (!answer) return fail("Write an answer in Romanian first.");
  if (answer.length > MAX_ANSWER_LENGTH) {
    return fail(`Answers can be up to ${MAX_ANSWER_LENGTH} characters.`);
  }
  if (context.length > MAX_CONTEXT_LENGTH) {
    return fail(`Context can be up to ${MAX_CONTEXT_LENGTH} characters.`);
  }
  if (target !== undefined && !isPlantId(target)) return fail(`Unknown plant: ${target}`);
  const targetPlantId: PlantId | undefined = target;

  // Each call costs money, so cap it per learner.
  if (await isRateLimited("grade:user", user.id, 30, 600)) {
    return fail("That's a lot of grading at once. Wait a few minutes and try again.", 429);
  }

  const { gradingId, result } = await gradeAndStore({
    userId: user.id,
    answer,
    context: context || undefined,
    targetPlantId,
  });

  return Response.json({
    gradingId,
    errors: result.errors,
    correctUses: result.correctUses,
    polishNotes: result.polishNotes,
  });
};
