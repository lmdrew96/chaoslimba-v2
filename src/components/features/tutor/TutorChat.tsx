"use client";

import { useEffect, useRef, useState, type JSX } from "react";
import { IntakeEvidence } from "@/components/features/intake/IntakeEvidence";
import { Markdown } from "@/components/Markdown";
import type { ChatConversation, ChatMessage } from "@/db/conversations";
import { PLANTS, getPlant } from "@/lib/taxonomy";

const NETWORK_ERROR = "Couldn't reach the server. Check your connection and try again.";
const TEXT_PLANTS = PLANTS.filter((p) => p.id !== "stress" && p.id !== "sounds");

const Bubble = ({ m }: { m: ChatMessage }) => (
  <div className={`flex flex-col gap-1 ${m.role === "learner" ? "items-end" : "items-start"}`}>
    <div
      className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
        m.role === "learner"
          ? "bg-primary text-primary-foreground"
          : "border border-border bg-card text-card-foreground"
      }`}
    >
      <Markdown className="text-base">{m.content}</Markdown>
    </div>
    {m.graded === false && <span className="text-xs text-muted-foreground">Couldn&apos;t be graded this time.</span>}
  </div>
);

/** The tutor chat. `intake` is the first conversation: fixed probes, then it ends on the evidence. */
export const TutorChat = ({ kind = "practice" }: { kind?: "practice" | "intake" }): JSX.Element => {
  const [conversation, setConversation] = useState<ChatConversation | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [seed, setSeed] = useState("");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/tutor?kind=${kind}`);
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Couldn't load your conversation. Try again.");
          return;
        }
        setConversation(data.conversation as ChatConversation | null);
      } catch {
        setError(NETWORK_ERROR);
      } finally {
        setLoaded(true);
      }
    };
    load();
  }, [kind]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [conversation?.messages.length]);

  const start = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, targetPlantId: kind === "practice" ? seed || undefined : undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't start a conversation. Try again.");
        return;
      }
      setConversation(data.conversation as ChatConversation);
    } catch {
      setError(NETWORK_ERROR);
    } finally {
      setBusy(false);
    }
  };

  const send = async () => {
    const text = draft.trim();
    if (busy || !text || !conversation) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/tutor/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: conversation.id, text }),
      });
      const data = await res.json();
      // The learner's message is saved even when the tutor fails to reply, so show it either way.
      const added = [data.learnerMessage, data.tutorMessage].filter(Boolean) as ChatMessage[];
      if (added.length > 0) {
        setConversation((c) =>
          c ? { ...c, messages: [...c.messages, ...added], completed: data.completed === true } : c,
        );
        setDraft("");
      }
      if (!res.ok) setError(data.error ?? "Something went wrong. Try again.");
    } catch {
      setError(NETWORK_ERROR);
    } finally {
      setBusy(false);
    }
  };

  const intake = kind === "intake";
  const starter = (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 text-card-foreground">
      {intake ? (
        <p className="text-sm text-muted-foreground">
          {conversation
            ? "Want a fresh start? A new first conversation plants on top of your current garden."
            : "A short chat, about eight answers. Write in Romanian as best you can; mistakes are the point."}
        </p>
      ) : (
        <label className="flex flex-col gap-1 text-sm font-medium">
          What to practice
          <select
            id="tutor-seed"
            value={seed}
            onChange={(e) => setSeed(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal text-foreground"
          >
            <option value="">Let my garden pick</option>
            {TEXT_PLANTS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <button
        onClick={start}
        disabled={busy}
        className="self-start rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
      >
        {busy
          ? "Starting…"
          : intake
            ? conversation
              ? "Start over"
              : "Start your first conversation"
            : conversation
              ? "New conversation"
              : "Start a conversation"}
      </button>
    </div>
  );

  if (!loaded) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="flex flex-col gap-6">
      {conversation && (
        <>
          <p className="text-sm text-muted-foreground">
            {intake
              ? "Your first conversation. The tutor is getting to know your Romanian."
              : conversation.targetPlantId
                ? `Practicing: ${getPlant(conversation.targetPlantId).name}`
                : "Free conversation. Your garden is empty, so there's no target yet."}
          </p>
          <div className="flex flex-col gap-3">
            {conversation.messages.map((m) => (
              <Bubble key={m.id} m={m} />
            ))}
            {busy && <p className="text-sm text-muted-foreground">…</p>}
            <div ref={endRef} />
          </div>
          {conversation.completed ? (
            <IntakeEvidence conversationId={conversation.id} />
          ) : (
            <div className="flex flex-col gap-2">
              <textarea
                id="tutor-draft"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                rows={2}
                placeholder="Scrie în română…"
                className="rounded-lg border border-border bg-background px-3 py-2 text-base text-foreground"
              />
              <button
                onClick={send}
                disabled={busy || !draft.trim()}
                className="self-end rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
              >
                Send
              </button>
            </div>
          )}
        </>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
      {(!intake || !conversation || conversation.completed) && starter}
    </div>
  );
};
