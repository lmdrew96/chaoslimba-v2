import Link from "next/link";
import { GraderLab } from "@/components/features/grader/GraderLab";

export const metadata = { title: "Try the grader · ChaosLimbă" };

export default function GraderPage() {
  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-12">
      <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
        ← Home
      </Link>
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">Try the grader</h1>
        <p className="text-muted-foreground">
          Write a Romanian answer and see what the grader finds. Every grade is saved and seeds your garden.
        </p>
      </div>
      <GraderLab />
    </main>
  );
}
