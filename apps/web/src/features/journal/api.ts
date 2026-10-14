import { createClient } from "@/lib/supabase/client";
import { fromHex, toHex, type KeyMaterial } from "./crypto";

export type EntryRow = {
  id: string;
  entry_date: string;
  mood: number | null;
  word_count: number;
  ciphertext: string;
};

export type JournalData = {
  userId: string;
  keys: KeyMaterial | null;
  entries: EntryRow[];
};

export async function fetchJournal(): Promise<JournalData> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Please sign in again.");

  const [keys, entries] = await Promise.all([
    supabase.from("journal_keys").select("kdf_salt,kdf_iterations,wrapped_dek,wrapped_dek_recovery").maybeSingle(),
    supabase
      .from("journal_entries")
      .select("id,entry_date,mood,word_count,ciphertext")
      .is("deleted_at", null)
      .order("entry_date", { ascending: false }),
  ]);
  if (keys.error) throw new Error(keys.error.message);
  if (entries.error) throw new Error(entries.error.message);

  return {
    userId: user.id,
    keys: keys.data && {
      // bytea comes back from PostgREST as "\x<hex>".
      salt: fromHex(keys.data.kdf_salt as string),
      iterations: keys.data.kdf_iterations,
      wrappedDek: keys.data.wrapped_dek,
      wrappedDekRecovery: keys.data.wrapped_dek_recovery,
    },
    entries: (entries.data ?? []) as EntryRow[],
  };
}

export async function saveKeys(m: KeyMaterial) {
  const { error } = await createClient().from("journal_keys").insert({
    kdf_salt: `\\x${toHex(m.salt)}`,
    kdf_iterations: m.iterations,
    wrapped_dek: m.wrappedDek,
    wrapped_dek_recovery: m.wrappedDekRecovery,
  });
  if (error) throw new Error(error.message);
}

export async function updatePassphraseWrap(v: { salt: Uint8Array; iterations: number; wrappedDek: string }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("journal_keys")
    .update({ kdf_salt: `\\x${toHex(v.salt)}`, kdf_iterations: v.iterations, wrapped_dek: v.wrappedDek })
    .eq("user_id", user?.id ?? "");
  if (error) throw new Error(error.message);
}

export async function saveEntry(v: {
  id: string;
  isNew: boolean;
  entry_date: string;
  mood: number | null;
  word_count: number;
  ciphertext: string;
}) {
  const supabase = createClient();
  const values = { mood: v.mood, word_count: v.word_count, ciphertext: v.ciphertext };
  const { error } = v.isNew
    ? await supabase.from("journal_entries").insert({ id: v.id, entry_date: v.entry_date, ...values })
    : await supabase.from("journal_entries").update(values).eq("id", v.id);
  if (error) throw new Error(error.message);
}

/** Hard delete: a private entry the user removes should really be gone. */
export async function deleteEntry(id: string) {
  const { error } = await createClient().from("journal_entries").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
