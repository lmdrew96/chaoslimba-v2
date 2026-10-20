import { getGarden } from "@/db/garden";
import { requireUser } from "@/lib/auth";

export async function GET(req: Request): Promise<Response> {
  try {
    const user = await requireUser(req);
    if (!user) return Response.json({ error: "Sign in to see your garden." }, { status: 401 });
    return Response.json({ plants: await getGarden(user.id) });
  } catch (err) {
    console.error("[garden] request failed", err);
    return Response.json({ error: "Couldn't load your garden. Try again in a moment." }, { status: 500 });
  }
}
