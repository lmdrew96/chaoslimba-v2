import Link from "next/link";
import { GardenView } from "@/components/features/garden/GardenView";

export const metadata = { title: "Your Error Garden · ChaosLimbă" };

export default function GardenPage() {
  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-12">
      <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
        ← Home
      </Link>
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">Your Error Garden</h1>
        <p className="text-muted-foreground">
          One plant per kind of mistake. Plants grow as you get them right and rest when you haven&apos;t practiced. They
          never die.
        </p>
      </div>
      <GardenView />
    </main>
  );
}
