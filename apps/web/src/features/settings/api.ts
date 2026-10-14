import { createClient } from "@/lib/supabase/client";
import type { FocusAreaId } from "@/lib/focus-areas";

export type Profile = {
  id: string;
  display_name: string | null;
  timezone: string;
  focus_areas: FocusAreaId[];
  interests: string | null;
  reminders_enabled: boolean;
  theme: "light" | "dark";
  is_adult_confirmed: boolean;
  onboarded_at: string | null;
};

const COLUMNS =
  "id,display_name,timezone,focus_areas,interests,reminders_enabled,theme,is_adult_confirmed,onboarded_at";

export async function fetchProfile(): Promise<Profile> {
  const { data, error } = await createClient().from("profiles").select(COLUMNS).single();
  if (error) throw new Error(error.message);
  return data as Profile;
}

export type ProfileUpdate = Partial<
  Pick<Profile, "display_name" | "timezone" | "focus_areas" | "interests" | "reminders_enabled" | "theme">
>;

export async function updateProfile(id: string, values: ProfileUpdate) {
  const { error } = await createClient().from("profiles").update(values).eq("id", id);
  if (error) throw new Error(error.message);
}

const EXPORT_TABLES = [
  "profiles",
  "tasks",
  "habits",
  "habit_logs",
  "goals",
  "workout_logs",
  "checkins",
  "focus_sessions",
  "expenses",
  "bills",
  "budgets",
  "savings_goals",
  "time_blocks",
  "journal_keys",
  "journal_entries",
] as const;

/**
 * Everything Dovie stores for this account, as JSON. Journal entries stay
 * encrypted: the export is only as readable as the data on the server.
 */
export async function exportMyData(): Promise<Blob> {
  const supabase = createClient();
  const out: Record<string, unknown> = {
    exported_at: new Date().toISOString(),
    note: "Journal entries are encrypted. Keep your passphrase or recovery key to read them.",
  };
  for (const table of EXPORT_TABLES) {
    const { data, error } = await supabase.from(table).select("*");
    if (error) throw new Error(`${table}: ${error.message}`);
    out[table] = data;
  }
  return new Blob([JSON.stringify(out, null, 2)], { type: "application/json" });
}

export async function clearMyData() {
  const { error } = await createClient().rpc("clear_my_data");
  if (error) throw new Error(error.message);
}

export async function deleteMyAccount() {
  const supabase = createClient();
  const { error } = await supabase.rpc("delete_my_account");
  if (error) throw new Error(error.message);
  // The account is gone, so only the local session needs clearing.
  await supabase.auth.signOut({ scope: "local" });
}
