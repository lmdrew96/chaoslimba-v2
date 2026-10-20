import { and, asc, eq, inArray, isNotNull } from "drizzle-orm";
import { getDb } from "@/db";
import { gradeFindings } from "@/db/schema";
import { plantHealth, type Attempt, type PlantHealth } from "@/lib/garden";
import type { PlantId } from "@/lib/taxonomy";

/** A plant is in the garden once the learner has made a confident error on it. */
export const getGardenPlantIds = async (userId: string): Promise<PlantId[]> => {
  const rows = await getDb()
    .selectDistinct({ plantId: gradeFindings.plantId })
    .from(gradeFindings)
    .where(
      and(
        eq(gradeFindings.userId, userId),
        eq(gradeFindings.kind, "error"),
        eq(gradeFindings.isMaybe, false),
        isNotNull(gradeFindings.plantId),
      ),
    );
  return rows.flatMap((r) => (r.plantId ? [r.plantId] : []));
};

/** Every garden plant's health, computed from its confident findings ("maybe" grades never count). */
export const getGarden = async (userId: string, now = new Date()): Promise<PlantHealth[]> => {
  const rows = await getDb()
    .select({ plantId: gradeFindings.plantId, kind: gradeFindings.kind, createdAt: gradeFindings.createdAt })
    .from(gradeFindings)
    .where(
      and(
        eq(gradeFindings.userId, userId),
        inArray(gradeFindings.kind, ["error", "correct_use"]),
        eq(gradeFindings.isMaybe, false),
        isNotNull(gradeFindings.plantId),
      ),
    )
    .orderBy(asc(gradeFindings.createdAt));

  const attempts = new Map<PlantId, Attempt[]>();
  const planted = new Set<PlantId>();
  for (const r of rows) {
    if (!r.plantId) continue;
    if (r.kind === "error") planted.add(r.plantId);
    const list = attempts.get(r.plantId) ?? [];
    list.push({ correct: r.kind === "correct_use", at: r.createdAt });
    attempts.set(r.plantId, list);
  }
  return [...planted].map((id) => plantHealth(id, attempts.get(id) ?? [], now));
};
