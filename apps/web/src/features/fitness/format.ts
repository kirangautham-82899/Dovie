/** Trim floating-point noise: 2.5 -> "2.5", 30 -> "30", 0.1 + 0.2 -> "0.3". */
export function formatAmount(n: number): string {
  return String(Math.round(n * 100) / 100);
}

export const MAX_AMOUNT = 100000;
export const UNIT_SUGGESTIONS = ["min", "steps", "km", "reps", "sets", "glasses", "hours"];
