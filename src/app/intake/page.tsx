import Link from "next/link";
import { TutorChat } from "@/components/features/tutor/TutorChat";

export const metadata = { title: "Your first conversation · ChaosLimbă" };

export default function IntakePage() {
  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-12">
      <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
        ← Home
      </Link>
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">Your first conversation</h1>
        <p className="text-muted-foreground">
          No placement test. Just chat, and your answers plant your garden. At the end you&apos;ll see what the grader
          noticed, in your own sentences.
        </p>
      </div>
      <TutorChat kind="intake" />
    </main>
  );
}
