export const FOCUS_AREAS = [
  { id: "tasks", label: "Plan my day", hint: "Top priorities and to-dos" },
  { id: "habits", label: "Build habits", hint: "Small daily streaks" },
  { id: "fitness", label: "Move my body", hint: "One-tap fitness goals" },
  { id: "money", label: "Mind my money", hint: "Bills, spending and budgets" },
  { id: "journal", label: "Reflect", hint: "A private daily journal" },
] as const;

export type FocusAreaId = (typeof FOCUS_AREAS)[number]["id"];
