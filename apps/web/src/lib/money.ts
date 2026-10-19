// Money is stored as integer paise. These helpers are the only place that
// converts between what the user types (rupees) and what the database holds.

const formatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

export function formatPaise(paise: number): string {
  return formatter.format(paise / 100);
}

/** "1,250.5" -> 125050. Returns null for anything that is not a positive amount. */
export function rupeesToPaise(input: string): number | null {
  const cleaned = input.replace(/[,\s₹]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const paise = Math.round(Number(cleaned) * 100);
  return paise > 0 && paise <= 100_000_000_000 ? paise : null;
}

export const EXPENSE_CATEGORIES = [
  "Everyday",
  "Food",
  "Groceries",
  "Transport",
  "Home",
  "Health",
  "Fun",
  "Shopping",
  "Family",
  "Other",
] as const;

export const INCOME_SOURCES = ["Salary", "Freelance", "Business", "Gift", "Refund", "Interest", "Other"] as const;
