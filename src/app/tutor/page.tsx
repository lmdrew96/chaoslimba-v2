import Link from "next/link";
import { TutorChat } from "@/components/features/tutor/TutorChat";

export const metadata = { title: "Chat with the tutor · ChaosLimbă" };

export default function TutorPage() {
  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-12">
      <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
        ← Home
      </Link>
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">Chat with the tutor</h1>
        <p className="text-muted-foreground">
          A conversation in Romanian. The tutor steers toward one thing from your garden. Everything you write is graded
          quietly in the background and grows your garden.
        </p>
      </div>
      <TutorChat />
    </main>
  );
}
