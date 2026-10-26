export const FOCUS_AREAS = [
  { id: "tasks", label: "A day that fits", hint: "Top three, to-dos and a calendar" },
  { id: "habits", label: "Small habits", hint: "Gentle daily rhythms" },
  { id: "fitness", label: "Movement", hint: "Walks, stretches, one-tap logging" },
  { id: "wellness", label: "Rest and care", hint: "Sleep, water, energy and focus" },
  { id: "money", label: "Money, gently", hint: "Bills, spending and savings" },
  { id: "journal", label: "A page for me", hint: "A private place to write" },
] as const;

export type FocusAreaId = (typeof FOCUS_AREAS)[number]["id"];
