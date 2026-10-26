import { createClient } from "@/lib/supabase/client";

export const MEALS = [
  { id: "breakfast", label: "Breakfast" },
  { id: "lunch", label: "Lunch" },
  { id: "dinner", label: "Dinner" },
  { id: "snack", label: "Snacks" },
] as const;

export type MealId = (typeof MEALS)[number]["id"];

export type Meal = { id: string; meal: MealId; title: string; calories: number | null; meal_date: string };

export async function fetchMeals(day: string): Promise<Meal[]> {
  const { data, error } = await createClient()
    .from("meals")
    .select("id,meal,title,calories,meal_date")
    .eq("meal_date", day)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Meal[];
}

export async function addMeal(v: { day: string; meal: MealId; title: string; calories: number | null }) {
  const { error } = await createClient()
    .from("meals")
    .insert({ meal_date: v.day, meal: v.meal, title: v.title.trim(), calories: v.calories });
  if (error) throw new Error(error.message);
}

export async function deleteMeal(id: string) {
  const { error } = await createClient().from("meals").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
