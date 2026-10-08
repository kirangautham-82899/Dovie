// Two-user RLS check against your Supabase project.
// Run from apps/web:  npm run test:rls
// Needs "Confirm email" turned off in Supabase. It creates two throwaway
// users (dovie-rls-*@example.com); delete them later in Authentication > Users.
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url?.startsWith("https://") || !key) {
  console.error("Missing/invalid NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env");
  process.exit(1);
}

let failed = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `  -> ${detail}`}`);
  if (!ok) failed++;
};

const stamp = Date.now();
const password = `Tmp-${stamp}-pw!`;

async function signUp(label, isAdult) {
  const client = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await client.auth.signUp({
    email: `dovie-rls-${label}-${stamp}@example.com`,
    password,
    options: { data: { display_name: `RLS ${label}`, is_adult_confirmed: isAdult } },
  });
  if (error || !data.session) {
    throw new Error(`signup ${label} failed: ${error?.message ?? "no session (is Confirm email still on?)"}`);
  }
  return { client, id: data.user.id };
}

const a = await signUp("a", true);
const b = await signUp("b", false);

// Signup trigger created profiles with the right 18+ flag.
const { data: profA } = await a.client.from("profiles").select("*").eq("id", a.id).single();
check("A has a profile with is_adult_confirmed = true", profA?.is_adult_confirmed === true);
const { data: profB } = await b.client.from("profiles").select("*").eq("id", b.id).single();
check("B has a profile with is_adult_confirmed = false", profB?.is_adult_confirmed === false);

// Each user sees only their own profile.
const { data: allProf } = await a.client.from("profiles").select("id");
check("A sees only their own profile", allProf?.length === 1 && allProf[0].id === a.id);

// A creates a task (user_id defaults to auth.uid()).
const { data: task, error: insErr } = await a.client
  .from("tasks").insert({ title: "A's private task" }).select().single();
check("A can insert a task", !insErr && task?.user_id === a.id, insErr?.message);

// B cannot read, update or delete it.
const { data: bRead } = await b.client.from("tasks").select("*").eq("id", task.id);
check("B cannot read A's task", bRead?.length === 0);

const { data: bUpd } = await b.client.from("tasks").update({ title: "hacked" }).eq("id", task.id).select();
check("B cannot update A's task", bUpd?.length === 0);

const { data: bDel } = await b.client.from("tasks").delete().eq("id", task.id).select();
check("B cannot delete A's task", bDel?.length === 0);

// B cannot insert a row owned by A.
const { error: spoofErr } = await b.client.from("tasks").insert({ title: "spoof", user_id: a.id });
check("B cannot insert a task as A", !!spoofErr);

// B cannot change profile ownership or read A's profile.
const { data: bProf } = await b.client.from("profiles").select("*").eq("id", a.id);
check("B cannot read A's profile", bProf?.length === 0);

// A's task is intact.
const { data: after } = await a.client.from("tasks").select("title").eq("id", task.id).single();
check("A's task is unchanged", after?.title === "A's private task");

// Clean up the rows we created (the two auth users stay until you delete them).
await a.client.from("tasks").delete().eq("id", task.id);

console.log(failed ? `\n${failed} check(s) FAILED` : "\nAll RLS checks passed");
process.exit(failed ? 1 : 0);
