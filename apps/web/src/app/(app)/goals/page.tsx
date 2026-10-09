import { Suspense } from "react";
import { getProfileAndToday } from "@/lib/profile";
import { HabitsManager } from "@/features/habits/habits-manager";
import { FitnessManager } from "@/features/fitness/fitness-manager";

export default function GoalsPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-8">
      <header>
        <h1 className="text-2xl font-semibold">Goals &amp; habits</h1>
        <p className="text-sm text-muted-foreground">Set them once, then log in one tap from Today.</p>
      </header>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading...</p>}>
        <GoalsContent />
      </Suspense>
    </main>
  );
}

async function GoalsContent() {
  const { today } = await getProfileAndToday();
  return (
    <>
      <HabitsManager today={today} />
      <FitnessManager today={today} />
    </>
  );
}
