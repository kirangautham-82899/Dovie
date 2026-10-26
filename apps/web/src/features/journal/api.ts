import { createClient } from "@/lib/supabase/client";

/** One dated page. `body` is null for a page saved in the older, passphrase-encrypted journal. */
export type EntryRow = {
  id: string;
  entry_date: string;
  mood: number | null;
  word_count: number;
  body: string | null;
  gratitude: string | null;
};

export const isOlderPage = (e: EntryRow) => e.body === null;

export async function fetchJournal(): Promise<EntryRow[]> {
  const { data, error } = await createClient()
    .from("journal_entries")
    .select("id,entry_date,mood,word_count,body,gratitude")
    .is("deleted_at", null)
    .order("entry_date", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as EntryRow[];
}

/** Writes a page. Saving over an older encrypted page replaces it, so its ciphertext is cleared. */
export async function saveEntry(v: {
  id: string;
  isNew: boolean;
  entry_date: string;
  mood: number | null;
  word_count: number;
  body: string;
  gratitude: string;
}) {
  const supabase = createClient();
  const values = { mood: v.mood, word_count: v.word_count, body: v.body, gratitude: v.gratitude, ciphertext: null };
  const { error } = v.isNew
    ? await supabase.from("journal_entries").insert({ id: v.id, entry_date: v.entry_date, ...values })
    : await supabase.from("journal_entries").update(values).eq("id", v.id);
  if (error) throw new Error(error.message);
}

/** Hard delete: a page the user removes should really be gone. */
export async function deleteEntry(id: string) {
  const { error } = await createClient().from("journal_entries").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
