import { AuthPanel } from "@/components/features/auth/AuthPanel";
import ThemeSelector from "@/components/features/settings/ThemeSelector";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-5xl space-y-8 px-4 py-12">
      <h1 className="text-3xl font-semibold">ChaosLimbă</h1>
      <AuthPanel />
      <ThemeSelector />
    </main>
  );
}
