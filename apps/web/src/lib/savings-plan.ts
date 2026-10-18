import { z } from "zod";

// The savings coach's answer. Shared by the API route and the Money screen.
export const SavingsPlan = z.object({
  headline: z.string().describe("One warm, specific sentence about the user's biggest saving opportunity."),
  monthlyPotential: z
    .number()
    .describe("Realistic total monthly saving in rupees across the tips, as a whole number. Never more than they spend."),
  tips: z
    .array(
      z.object({
        title: z.string().describe("A short action, under eight words."),
        detail: z.string().describe("One or two sentences that use the user's own numbers and say exactly what to do."),
        category: z.string().describe("The spending category it applies to, or 'General'."),
        monthlySaving: z.number().describe("Estimated rupees saved per month, a whole number."),
        difficulty: z.enum(["easy", "medium", "stretch"]),
      }),
    )
    .describe("Three to five tips, biggest realistic saving first. No two tips about the same category."),
  challenge: z
    .object({
      title: z.string().describe("A name for a small 7-day challenge."),
      detail: z.string().describe("What to do each day, in one or two sentences."),
    })
    .describe("A small, fun 7-day challenge tied to their biggest opportunity."),
  goalNote: z
    .string()
    .describe("If there are savings goals: how much sooner the top goal could be reached with these savings. Otherwise an empty string."),
});

export type SavingsPlan = z.infer<typeof SavingsPlan>;
