import Link from "next/link";
import { AuthPanel } from "@/components/features/auth/AuthPanel";
import ThemeSelector from "@/components/features/settings/ThemeSelector";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-5xl space-y-8 px-4 py-12">
      <h1 className="text-3xl font-semibold">ChaosLimbă</h1>
      <AuthPanel />
      <Link
        href="/grader"
        className="inline-block rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
      >
        Try the grader →
      </Link>
      <ThemeSelector />
    </main>
  );
}
