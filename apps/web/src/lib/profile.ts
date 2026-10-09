import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { todayInTimezone } from "@/lib/dates";

/**
 * The signed-in user's profile plus their local date. Computed per request;
 * sends people who have not finished onboarding to /onboarding.
 */
export async function getProfileAndToday() {
  await connection();
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, focus_areas, timezone, onboarded_at")
    .single();

  if (!profile?.onboarded_at) redirect("/onboarding");

  return { profile, today: todayInTimezone(profile.timezone) };
}
