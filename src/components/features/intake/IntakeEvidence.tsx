"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type JSX } from "react";
import { Markdown } from "@/components/Markdown";
import type { IntakeEvidence as Evidence, PlantEvidence } from "@/db/conversations";
import { getPlant } from "@/lib/taxonomy";

const NETWORK_ERROR = "Couldn't reach the server. Check your connection and try again.";

const times = (n: number): string => (n === 1 ? "once" : `${n} times`);

const summary = (p: PlantEvidence): string => {
  const parts: string[] = [];
  if (p.correctUses.length > 0) parts.push(`used correctly ${times(p.correctUses.length)}`);
  if (p.errors.length > 0) parts.push(`mixed up ${times(p.errors.length)}`);
  const text = parts.join(", ");
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const SeedCard = ({
  p,
  startHere,
  onPractice,
  busy,
}: {
  p: PlantEvidence;
  startHere: boolean;
  onPractice: () => void;
  busy: boolean;
}) => {
  const plant = getPlant(p.plantId);
  return (
    <article
      className={`flex flex-col gap-3 rounded-2xl border bg-card p-4 text-card-foreground ${
        startHere ? "border-primary ring-2 ring-primary" : "border-border"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-semibold">{plant.name}</h3>
        {startHere && (
          <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
            Start here
          </span>
        )}
      </div>
      <p className="text-sm">{summary(p)}.</p>
      <ul className="flex flex-col gap-2">
        {p.errors.map((e, i) => (
          <li key={`e${i}`} className="flex flex-col gap-1 rounded-lg bg-muted p-3 text-sm">
            <span className="text-muted-foreground">
              &ldquo;<Markdown inline>{e.answer}</Markdown>&rdquo;
            </span>
            <span>
              <span className="text-destructive line-through">
                <Markdown inline>{e.span}</Markdown>
              </span>
              <span className="px-2 text-muted-foreground">→</span>
              <span className="font-semibold">
                <Markdown inline>{e.correction ?? ""}</Markdown>
              </span>
            </span>
            {e.explanation && <Markdown className="text-muted-foreground">{e.explanation}</Markdown>}
          </li>
        ))}
        {p.correctUses.map((c, i) => (
          <li key={`c${i}`} className="flex flex-col gap-1 rounded-lg border border-border p-3 text-sm">
            <span className="text-muted-foreground">
              &ldquo;<Markdown inline>{c.answer}</Markdown>&rdquo;
            </span>
            <span>
              Right:{" "}
              <span className="font-semibold">
                <Markdown inline>{c.span}</Markdown>
              </span>
            </span>
          </li>
        ))}
      </ul>
      {startHere && (
        <button
          onClick={onPractice}
          disabled={busy}
          className="self-start rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
        >
          {busy ? "Starting…" : "Practice this"}
        </button>
      )}
    </article>
  );
};

/** The end of intake: no score, just what it saw, with one seed to start on. */
export const IntakeEvidence = ({ conversationId }: { conversationId: string }): JSX.Element => {
  const router = useRouter();
  const [evidence, setEvidence] = useState<Evidence | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/intake/evidence?conversationId=${conversationId}`);
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Couldn't load what intake found. Try again.");
          return;
        }
        setEvidence(data.evidence as Evidence);
      } catch {
        setError(NETWORK_ERROR);
      }
    };
    load();
  }, [conversationId]);

  const practice = async (targetPlantId: string | null) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetPlantId: targetPlantId ?? undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't start practice. Try again.");
        setBusy(false);
        return;
      }
      router.push("/tutor");
    } catch {
      setError(NETWORK_ERROR);
      setBusy(false);
    }
  };

  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!evidence) return <p className="text-sm text-muted-foreground">Planting your garden…</p>;

  // The start-here seed goes first, so the one thing to do next is at the top.
  const seeds = [...evidence.seeds].sort(
    (a, b) => Number(b.plantId === evidence.startHere) - Number(a.plantId === evidence.startHere),
  );

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-semibold">Your first seeds</h2>
          <p className="text-sm text-muted-foreground">
            What the grader saw in your answers, with your own sentences. These are where your garden starts, not a
            score.
          </p>
        </div>
        {seeds.length > 0 ? (
          seeds.map((p) => (
            <SeedCard
              key={p.plantId}
              p={p}
              startHere={p.plantId === evidence.startHere}
              onPractice={() => practice(p.plantId)}
              busy={busy}
            />
          ))
        ) : (
          <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-border p-4 text-sm">
            <p className="text-muted-foreground">No confident mix-ups this time, so nothing&apos;s planted yet.</p>
            <button
              onClick={() => practice(null)}
              disabled={busy}
              className="self-start rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
            >
              {busy ? "Starting…" : "Keep talking"}
            </button>
          </div>
        )}
      </section>

      {evidence.solid.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Looked solid</h2>
          <ul className="flex flex-col gap-1 text-sm">
            {evidence.solid.map((p) => (
              <li key={p.plantId}>
                <span className="font-medium">{getPlant(p.plantId).name}</span>
                <span className="text-muted-foreground"> · {summary(p).toLowerCase()}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};
