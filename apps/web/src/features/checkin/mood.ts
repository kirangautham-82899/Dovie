export const MOODS = [
  { value: 1, label: "Rough" },
  { value: 2, label: "Low" },
  { value: 3, label: "Okay" },
  { value: 4, label: "Good" },
  { value: 5, label: "Great" },
] as const;

export function moodLabel(value: number | null | undefined): string {
  return MOODS.find((m) => m.value === value)?.label ?? "";
}

export const SCORE_CATEGORIES: Record<string, { label: string; weight: number }> = {
  priorities: { label: "Priorities", weight: 40 },
  tasks: { label: "Other tasks", weight: 20 },
  habits: { label: "Habits", weight: 25 },
  fitness: { label: "Fitness", weight: 15 },
};

/** A short, encouraging line for a score. Never a health or money claim. */
export function scoreMessage(score: number | null): string {
  if (score === null) return "Nothing was planned today, so there is no score. Add a task or habit to get one.";
  if (score >= 80) return "A great day. Nice work.";
  if (score >= 50) return "Solid progress. Every little win counts.";
  return "Tomorrow is a fresh start. Small steps still count.";
}
