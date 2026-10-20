"use client";

import Link from "next/link";
import { useEffect, useState, type JSX } from "react";
import { GARDEN_RULES, type PlantHealth, type PlantState } from "@/lib/garden";
import { BEDS, getPlant } from "@/lib/taxonomy";

const STATES: Record<PlantState, { label: string; meaning: string; chip: string }> = {
  sprout: { label: "Sprout", meaning: "Not enough data yet", chip: "border border-dashed border-border" },
  wilting: { label: "Wilting", meaning: "Struggling right now", chip: "bg-accent text-accent-foreground" },
  growing: { label: "Growing", meaning: "Improving", chip: "bg-secondary text-secondary-foreground" },
  thriving: { label: "Thriving", meaning: "Outgrown for now", chip: "bg-primary text-primary-foreground" },
};

const shortDate = (iso: string): string =>
  new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

const PlantCard = ({ p }: { p: PlantHealth }) => {
  const plant = getPlant(p.plantId);
  const state = STATES[p.state];
  return (
    <article
      className={`flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 text-card-foreground ${
        p.dormant ? "opacity-50" : ""
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-semibold">{plant.name}</h3>
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${state.chip}`}>{state.label}</span>
        {p.dormant && (
          <span className="rounded-full border border-border px-2 py-0.5 text-xs font-semibold">Dormant</span>
        )}
      </div>
      <p className="text-sm text-muted-foreground">{plant.description}</p>
      <p className="text-sm">
        {p.accuracy === null
          ? `${state.meaning}: ${p.totalAttempts} of ${GARDEN_RULES.minAttempts} attempts so far.`
          : `${state.meaning}. ${Math.round(p.accuracy * 100)}% right over your last ${p.windowAttempts} attempts (${p.windowCorrect} of ${p.windowAttempts}).`}
      </p>
      <p className="text-xs text-muted-foreground">
        {p.dormant ? `Resting since ${shortDate(p.lastAttemptAt)}. Practice it to wake it up.` : `Last practiced ${shortDate(p.lastAttemptAt)}`}
      </p>
    </article>
  );
};

export const GardenView = (): JSX.Element => {
  const [plants, setPlants] = useState<PlantHealth[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/garden");
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Couldn't load your garden. Try again.");
          return;
        }
        setPlants(data.plants as PlantHealth[]);
      } catch {
        setError("Couldn't reach the server. Check your connection and try again.");
      }
    };
    load();
  }, []);

  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!plants) return <p className="text-sm text-muted-foreground">Loading your garden…</p>;
  if (plants.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
        Nothing planted yet. A plant appears the first time the grader confidently catches an error.{" "}
        <Link href="/grader" className="underline">
          Grade an answer
        </Link>{" "}
        to plant your first seed.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {BEDS.map((bed) => {
        const inBed = plants.filter((p) => getPlant(p.plantId).bed === bed.id);
        if (inBed.length === 0) return null;
        return (
          <section key={bed.id} className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">{bed.name}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {inBed.map((p) => (
                <PlantCard key={p.plantId} p={p} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
};
