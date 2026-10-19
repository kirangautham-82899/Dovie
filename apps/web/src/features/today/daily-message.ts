// One gentle line a day. It is picked from the date, so everyone sees the same
// line all day and it changes at midnight.
const MESSAGES = [
  "You don't have to do it all. Just begin somewhere.",
  "Small steps still move you forward.",
  "Be as kind to yourself as you are to others.",
  "Rest is part of the plan, not a break from it.",
  "Do one thing well, then see how you feel.",
  "Progress is quiet. Keep going anyway.",
  "Today only needs your next small step.",
  "Drink some water. Unclench your shoulders.",
  "Done is lovely. Done gently is better.",
  "You are allowed to take it slowly.",
  "Start with the easiest thing on the list.",
  "A little attention goes a long way.",
  "Not everything is urgent. Choose what matters.",
  "Notice one good thing before noon.",
  "You've handled hard days before. This one too.",
  "Let good enough be good enough today.",
  "Breathe in. Pick one thing. Begin.",
  "Your pace is a fine pace.",
  "Make space for something you enjoy.",
  "Tidy one small corner, inside or out.",
  "Ask for help if the day feels heavy.",
  "Today is a fresh page.",
  "Celebrate the tiny wins. They add up.",
  "Move a little. Even a stretch counts.",
  "You are doing better than you think.",
  "Finish one thing, then give yourself a pause.",
  "Plans can bend. So can you.",
  "Take the next step, not the whole staircase.",
  "Be present for one ordinary moment today.",
  "Mistakes are just practice with feelings.",
  "Look after the person who looks after everything.",
];

/** The line for a local date (YYYY-MM-DD). */
export function dailyMessage(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const day = Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
  return MESSAGES[((day % MESSAGES.length) + MESSAGES.length) % MESSAGES.length];
}
