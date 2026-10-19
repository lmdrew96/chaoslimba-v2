"use client";

import { useState, type JSX } from "react";
import { Markdown } from "@/components/Markdown";
import type { GradeResult } from "@/lib/grader";
import { PLANTS, getPlant, type PlantId } from "@/lib/taxonomy";

type GradeResponse = Omit<GradeResult, "raw"> & { gradingId: string };
type ErrorFinding = GradeResult["errors"][number];

const NETWORK_ERROR = "Couldn't reach the server. Check your connection and try again.";

const percent = (confidence: number): string => `${Math.round(confidence * 100)}%`;

const PlantLabel = ({ id }: { id: PlantId }) => (
  <span className="text-xs font-medium text-muted-foreground">
    {getPlant(id).name} · <code className="font-mono">{id}</code>
  </span>
);

const Section = ({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) => (
  <section className="flex flex-col gap-3">
    <div>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground">{hint}</p>
    </div>
    {children}
  </section>
);

const ErrorCard = ({ e }: { e: ErrorFinding }) => (
  <article
    className={`flex flex-col gap-2 rounded-2xl border bg-card p-4 text-card-foreground ${
      e.isMaybe ? "border-dashed border-border" : "border-border"
    }`}
  >
    <div className="flex flex-wrap items-center gap-2">
      <PlantLabel id={e.plantId} />
      {e.isMaybe && (
        <span className="rounded-full border border-border px-2 py-0.5 text-xs font-semibold">maybe?</span>
      )}
      {e.beautifulMistake && (
        <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
          Beautiful Mistake
        </span>
      )}
      <span className="ml-auto text-xs text-muted-foreground">confidence {percent(e.confidence)}</span>
    </div>
    <p className="text-base">
      <span className="text-destructive line-through">
        <Markdown inline>{e.span}</Markdown>
      </span>
      <span className="px-2 text-muted-foreground">→</span>
      <span className="font-semibold">
        <Markdown inline>{e.correction}</Markdown>
      </span>
    </p>
    <Markdown className="text-muted-foreground">{e.explanation}</Markdown>
  </article>
);

const Empty = ({ children }: { children: React.ReactNode }) => (
  <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">{children}</p>
);

const TEXT_PLANTS = PLANTS.filter((p) => p.id !== "stress" && p.id !== "sounds");

export const GraderLab = (): JSX.Element => {
  const [answer, setAnswer] = useState("");
  const [context, setContext] = useState("");
  const [target, setTarget] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<GradeResponse | null>(null);

  const grade = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer, context, targetPlantId: target || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Try again.");
        return;
      }
      setResult(data as GradeResponse);
    } catch {
      setError(NETWORK_ERROR);
    } finally {
      setBusy(false);
    }
  };

  const confident = result?.errors.filter((e) => !e.isMaybe) ?? [];
  const maybes = result?.errors.filter((e) => e.isMaybe) ?? [];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 text-card-foreground">
        <label className="flex flex-col gap-1 text-sm font-medium">
          What were you answering? <span className="font-normal text-muted-foreground">(optional)</span>
          <input
            id="grader-context"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="Ce ai făcut ieri?"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal text-foreground"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Your answer in Romanian
          <textarea
            id="grader-answer"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.metaKey || e.ctrlKey) && grade()}
            rows={4}
            placeholder="Ieri am mergut la piață și am cumpărat o proiect."
            className="rounded-lg border border-border bg-background px-3 py-2 text-base font-normal text-foreground"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Seed to check for correct uses <span className="font-normal text-muted-foreground">(optional)</span>
          <select
            id="grader-target"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal text-foreground"
          >
            <option value="">None</option>
            {TEXT_PLANTS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <button
          onClick={grade}
          disabled={busy || !answer.trim()}
          className="self-start rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
        >
          {busy ? "Grading…" : "Grade it"}
        </button>
      </div>

      {result && (
        <>
          <Section title="Errors" hint="Confident findings. These are what move a plant's health.">
            {confident.length > 0 ? (
              confident.map((e, i) => <ErrorCard key={i} e={e} />)
            ) : (
              <Empty>No confident errors.</Empty>
            )}
          </Section>

          <Section title="Maybe?" hint="The grader isn't sure. These are shown but never change a plant.">
            {maybes.length > 0 ? maybes.map((e, i) => <ErrorCard key={i} e={e} />) : <Empty>Nothing uncertain.</Empty>}
          </Section>

          <Section
            title="Correct uses"
            hint="Structures from your garden (and the seed you picked) that you got right. These help plants recover."
          >
            {result.correctUses.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {result.correctUses.map((c, i) => (
                  <li
                    key={i}
                    className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-3 text-card-foreground"
                  >
                    <span className="font-semibold">
                      <Markdown inline>{c.span}</Markdown>
                    </span>
                    <PlantLabel id={c.plantId} />
                    {c.isMaybe && (
                      <span className="rounded-full border border-border px-2 py-0.5 text-xs font-semibold">
                        maybe?
                      </span>
                    )}
                    <span className="ml-auto text-xs text-muted-foreground">confidence {percent(c.confidence)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>None found. Correct uses are only checked for plants already in your garden or the seed you pick.</Empty>
            )}
          </Section>

          <Section title="Polish notes" hint="Correct, but a native speaker might say it differently. Never stored in the garden.">
            {result.polishNotes.length > 0 ? (
              result.polishNotes.map((p, i) => (
                <article
                  key={i}
                  className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 text-card-foreground"
                >
                  <p className="text-base">
                    <Markdown inline>{p.span}</Markdown>
                    <span className="px-2 text-muted-foreground">→</span>
                    <span className="font-semibold">
                      <Markdown inline>{p.suggestion}</Markdown>
                    </span>
                  </p>
                  <Markdown className="text-muted-foreground">{p.explanation}</Markdown>
                </article>
              ))
            ) : (
              <Empty>No polish notes.</Empty>
            )}
          </Section>
        </>
      )}
    </div>
  );
};
