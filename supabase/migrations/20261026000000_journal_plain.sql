-- The journal is a plain notebook: the words are saved as text on the account,
-- protected by row-level security like every other table, with no passphrase.
--
-- Entries written before this change hold only ciphertext (body is null). They
-- stay in place, shown in the app as older private pages that can be deleted
-- or written over. journal_keys is left untouched.

alter table public.journal_entries
  add column body text check (body is null or char_length(body) <= 20000),
  add column gratitude text check (gratitude is null or char_length(gratitude) <= 300);

-- New entries no longer carry ciphertext.
alter table public.journal_entries
  alter column ciphertext drop not null;
