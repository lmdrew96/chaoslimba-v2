"use client";

import { useEffect, useState } from "react";
import type { PublicAccount } from "@/lib/auth";

type Mode = "signup" | "login";
type Action = Mode | "logout" | "me";

const callAuth = async (
  action: Action,
  fields: Record<string, string> = {},
): Promise<{ account?: PublicAccount | null; error?: string }> => {
  const res = await fetch("/api/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...fields }),
  });
  const data = await res.json();
  if (!res.ok) return { error: data.error ?? "Something went wrong. Try again." };
  return data;
};

const NETWORK_ERROR = "Couldn't reach the server. Check your connection and try again.";

export const AuthPanel = () => {
  // undefined = still checking the session; null = signed out.
  const [account, setAccount] = useState<PublicAccount | null | undefined>(undefined);
  const [mode, setMode] = useState<Mode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    callAuth("me")
      .then((data) => {
        if (data.error) setError(data.error);
        setAccount(data.account ?? null);
      })
      .catch(() => {
        setError(NETWORK_ERROR);
        setAccount(null);
      });
  }, []);

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const data = await callAuth(mode, { email, password });
      if (data.error) {
        setError(data.error);
        return;
      }
      setPassword("");
      setAccount(data.account ?? null);
    } catch {
      setError(NETWORK_ERROR);
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const data = await callAuth("logout");
      if (data.error) {
        setError(data.error);
        return;
      }
      setAccount(null);
    } catch {
      setError(NETWORK_ERROR);
    } finally {
      setBusy(false);
    }
  };

  if (account === undefined) {
    return <p className="text-sm text-muted-foreground">Checking your session…</p>;
  }

  if (account) {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4 text-card-foreground">
        <p className="text-sm">
          Signed in as <strong>{account.email}</strong>
        </p>
        <button
          onClick={signOut}
          disabled={busy}
          className="ml-auto rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-60"
        >
          {busy ? "Signing out…" : "Sign out"}
        </button>
        {error && <p className="w-full text-sm text-destructive">{error}</p>}
      </div>
    );
  }

  const tab = (on: boolean) =>
    `flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
      on
        ? "border-primary bg-primary text-primary-foreground"
        : "border-border text-muted-foreground hover:text-foreground"
    }`;

  return (
    <div className="flex max-w-md flex-col gap-3 rounded-2xl border border-border bg-card p-4 text-card-foreground">
      <div className="flex gap-2">
        <button
          onClick={() => {
            setMode("signup");
            setError("");
          }}
          className={tab(mode === "signup")}
        >
          Create account
        </button>
        <button
          onClick={() => {
            setMode("login");
            setError("");
          }}
          className={tab(mode === "login")}
        >
          Sign in
        </button>
      </div>

      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder="you@example.com"
        autoComplete="email"
        aria-label="Email"
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder={mode === "signup" ? "Password (10+ characters)" : "Password"}
        autoComplete={mode === "signup" ? "new-password" : "current-password"}
        aria-label="Password"
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
      />

      {error && <p className="text-sm text-destructive">{error}</p>}

      <button
        onClick={submit}
        disabled={busy}
        className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
      >
        {busy ? "Working…" : mode === "signup" ? "Create account" : "Sign in"}
      </button>

      {mode === "signup" && (
        <p className="text-xs text-muted-foreground">There&rsquo;s no password reset yet.</p>
      )}
    </div>
  );
};
