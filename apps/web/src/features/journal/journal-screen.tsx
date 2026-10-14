"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookHeart, KeyRound, Lock, Search, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/modal";
import { ChoicePills, Field, textareaClass } from "@/components/field";
import { EmptyState, ErrorNote, SectionTitle } from "@/components/page-header";
import { MOODS, moodLabel } from "@/features/checkin/mood";
import { addDays, formatDate } from "@/lib/dates";
import * as api from "./api";
import * as c from "./crypto";
import { lockSession, unlockSession, useJournalSession } from "./session";

const PROMPTS = [
  "What did you do today that your past self would be proud of?",
  "What felt lighter than you expected?",
  "Who made today a little better?",
  "What is one thing you want to remember about today?",
  "Where did you find a moment of calm?",
  "What would you like to let go of tonight?",
  "What surprised you today?",
];

function promptFor(date: string) {
  const day = Math.floor(Date.parse(`${date}T00:00:00Z`) / 86_400_000);
  return PROMPTS[day % PROMPTS.length];
}

function wordCount(s: string) {
  return s.trim() ? s.trim().split(/\s+/).length : 0;
}

export function JournalScreen({ today }: { today: string }) {
  const query = useQuery({ queryKey: ["journal"], queryFn: api.fetchJournal });
  const dek = useJournalSession(query.data?.userId);

  if (query.isPending) return <p className="text-sm text-muted-foreground">Opening your journal…</p>;
  if (query.isError) return <ErrorNote message={query.error.message} onRetry={() => query.refetch()} />;

  const { userId, keys } = query.data;
  if (!keys) return <SetupJournal userId={userId} />;
  if (!dek) return <UnlockJournal userId={userId} keys={keys} />;
  return <OpenJournal today={today} userId={userId} dek={dek} keys={keys} entries={query.data.entries} />;
}

function SetupJournal({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const [pass, setPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [pending, setPending] = useState<Awaited<ReturnType<typeof c.setupKeys>> | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tooShort = pass.length < c.MIN_PASSPHRASE_LENGTH;
  const mismatch = confirmPass.length > 0 && pass !== confirmPass;

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (tooShort || pass !== confirmPass) return;
    setBusy(true);
    setError(null);
    try {
      setPending(await c.setupKeys(pass, userId));
    } catch {
      setError("Your browser could not create a key. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function finish() {
    if (!pending) return;
    setBusy(true);
    setError(null);
    try {
      await api.saveKeys(pending.material);
      unlockSession(userId, pending.dek);
      await qc.invalidateQueries({ queryKey: ["journal"] });
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <Card className="mx-auto max-w-lg border bg-card">
      <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-secondary text-primary">
        <KeyRound />
      </div>
      {!pending ? (
        <form onSubmit={create} className="mt-5 space-y-4">
          <div className="text-center">
            <h2 className="font-serif text-2xl">Put it somewhere safe.</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Choose a passphrase. Your entries are encrypted in this browser with it before they are saved, so not even
              Dovie can read them.
            </p>
          </div>
          <Field label="Passphrase" hint={`At least ${c.MIN_PASSPHRASE_LENGTH} characters. A short sentence works well.`}>
            <Input type="password" autoComplete="new-password" value={pass} onChange={(e) => setPass(e.target.value)} />
          </Field>
          <Field label="Type it once more">
            <Input
              type="password"
              autoComplete="new-password"
              value={confirmPass}
              aria-invalid={mismatch}
              onChange={(e) => setConfirmPass(e.target.value)}
            />
          </Field>
          {mismatch && <p className="text-xs text-destructive">Those don&apos;t match yet.</p>}
          {error && <ErrorNote message={error} />}
          <Button type="submit" size="lg" className="w-full" disabled={busy || tooShort || pass !== confirmPass}>
            {busy ? "Creating your key…" : "Continue"}
          </Button>
        </form>
      ) : (
        <div className="mt-5 space-y-4">
          <div className="text-center">
            <h2 className="font-serif text-2xl">Your recovery key</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              If you forget your passphrase, this key is the only way back in. Save it in a password manager or write it
              down. It will not be shown again.
            </p>
          </div>
          <p className="rounded-lg border border-dashed border-primary/50 p-3 text-center font-mono text-sm break-all select-all">{pending.recoveryKey}</p>
          <Button variant="outline" className="w-full" onClick={() => navigator.clipboard?.writeText(pending.recoveryKey)}>
            Copy recovery key
          </Button>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-1 accent-primary" checked={saved} onChange={(e) => setSaved(e.target.checked)} />
            I&apos;ve saved my recovery key somewhere safe.
          </label>
          {error && <ErrorNote message={error} />}
          <Button size="lg" className="w-full" disabled={!saved || busy} onClick={finish}>
            {busy ? "Saving…" : "Open my journal"}
          </Button>
        </div>
      )}
    </Card>
  );
}

function UnlockJournal({ userId, keys }: { userId: string; keys: c.KeyMaterial }) {
  const qc = useQueryClient();
  const [mode, setMode] = useState<"pass" | "recover">("pass");
  const [pass, setPass] = useState("");
  const [recovery, setRecovery] = useState("");
  const [newPass, setNewPass] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function unlock(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "pass") {
        unlockSession(userId, await c.unlockWithPassphrase(pass, keys, userId));
      } else {
        let dek: Uint8Array;
        try {
          dek = await c.unlockWithRecoveryKey(recovery, keys, userId);
        } catch {
          throw new Error("That recovery key did not work. Check it and try again.");
        }
        await api.updatePassphraseWrap(await c.rewrapDek(dek, newPass, userId));
        unlockSession(userId, dek);
        await qc.invalidateQueries({ queryKey: ["journal"] });
      }
    } catch (err) {
      setError(mode === "pass" ? "That passphrase did not match. Take your time." : (err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="mx-auto max-w-md border bg-card text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-secondary text-primary">
        <Lock />
      </div>
      <h2 className="mt-5 font-serif text-2xl">Your pages are private.</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {mode === "pass"
          ? "Enter your passphrase to open your journal."
          : "Use your recovery key, then choose a new passphrase."}
      </p>
      <form onSubmit={unlock} className="mt-6 space-y-3 text-left">
        {mode === "pass" ? (
          <Input
            type="password"
            autoFocus
            aria-label="Passphrase"
            placeholder="Passphrase"
            autoComplete="current-password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
          />
        ) : (
          <>
            <Field label="Recovery key">
              <Input autoFocus value={recovery} onChange={(e) => setRecovery(e.target.value)} className="font-mono" />
            </Field>
            <Field label="New passphrase" hint={`At least ${c.MIN_PASSPHRASE_LENGTH} characters.`}>
              <Input type="password" autoComplete="new-password" value={newPass} onChange={(e) => setNewPass(e.target.value)} />
            </Field>
          </>
        )}
        {error && <ErrorNote message={error} />}
        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={busy || (mode === "pass" ? !pass : !recovery || newPass.length < c.MIN_PASSPHRASE_LENGTH)}
        >
          {busy ? "Unlocking…" : "Unlock journal"}
        </Button>
      </form>
      <button
        type="button"
        onClick={() => {
          setMode(mode === "pass" ? "recover" : "pass");
          setError(null);
        }}
        className="mt-4 text-xs text-muted-foreground underline"
      >
        {mode === "pass" ? "Forgot your passphrase? Use your recovery key" : "Back to passphrase"}
      </button>
    </Card>
  );
}

type Decrypted = Record<string, c.EntryContent>;

function OpenJournal({
  today,
  userId,
  dek,
  keys,
  entries,
}: {
  today: string;
  userId: string;
  dek: Uint8Array;
  keys: c.KeyMaterial;
  entries: api.EntryRow[];
}) {
  const qc = useQueryClient();
  const [plain, setPlain] = useState<Decrypted>({});
  const [failed, setFailed] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState("");
  const [changing, setChanging] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    Promise.all(
      entries.map(async (e) => {
        try {
          return [e.id, await c.decryptEntry(dek, userId, e.id, e.ciphertext)] as const;
        } catch {
          return [e.id, null] as const;
        }
      }),
    ).then((results) => {
      if (!live) return;
      const next: Decrypted = {};
      const bad: string[] = [];
      for (const [id, content] of results) {
        if (content) next[id] = content;
        else bad.push(id);
      }
      setPlain(next);
      setFailed(bad);
      setLoaded(true);
    });
    return () => {
      live = false;
    };
  }, [entries, dek, userId]);

  const todayEntry = entries.find((e) => e.entry_date === today);
  const monthAgo = entries.find((e) => e.entry_date === addDays(today, -30));

  const remove = useMutation({
    mutationFn: api.deleteEntry,
    onSettled: () => qc.invalidateQueries({ queryKey: ["journal"] }),
  });

  const past = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries
      .filter((e) => e.entry_date !== today)
      .filter((e) => {
        if (!q) return true;
        const p = plain[e.id];
        return `${p?.body ?? ""} ${p?.gratitude ?? ""} ${moodLabel(e.mood)}`.toLowerCase().includes(q);
      });
  }, [entries, plain, search, today]);

  return (
    <div className="ruled lg:grid-cols-[1.3fr_1fr]">
      <div className="divide-y">
        {failed.length > 0 && (
          <div className="p-5">
            <ErrorNote
              message={`${failed.length} entr${failed.length === 1 ? "y" : "ies"} could not be decrypted. They have been left untouched.`}
            />
          </div>
        )}
        {loaded ? (
          // Keyed by date so the form keeps its text when the first save creates the row.
          <TodayEntry
            key={today}
            today={today}
            userId={userId}
            dek={dek}
            existing={todayEntry}
            content={todayEntry ? plain[todayEntry.id] : undefined}
            onSaved={(m) => setMessage(m)}
          />
        ) : (
          <p className="p-5 text-sm text-muted-foreground">Unlocking your entries…</p>
        )}
        <div className="flex flex-wrap items-center gap-2 px-5 py-4 sm:px-6">
          {message && <p className="mr-auto text-sm text-primary">{message}</p>}
          <Button variant="outline" size="sm" onClick={lockSession}>
            <Lock /> Lock journal
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setChanging(true)}>
            Change passphrase
          </Button>
        </div>
      </div>

      <div className="divide-y">
        <Card className="border-t-2 border-t-chart-2">
          <SectionTitle icon={Sparkles} title="A month ago" />
          {monthAgo && plain[monthAgo.id] ? (
            <p className="font-serif text-base leading-relaxed italic">
              &ldquo;{plain[monthAgo.id].body.slice(0, 280)}
              {plain[monthAgo.id].body.length > 280 ? "…" : ""}&rdquo;
            </p>
          ) : (
            <p className="text-sm opacity-80">A little look back will appear here once you have an entry from a month ago.</p>
          )}
        </Card>

        <Card>
          <SectionTitle icon={Search} title="Find a page" />
          <Input
            placeholder="Search your entries"
            aria-label="Search your entries"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Search happens only in this browser, after your entries are decrypted.
          </p>
          {past.length === 0 ? (
            <div className="mt-4">
              <EmptyState title={search ? "Nothing matches that" : "Your past pages will gather here"} />
            </div>
          ) : (
            <ul className="mt-3 max-h-[28rem] overflow-y-auto">
              {past.map((e) => (
                <li key={e.id} className="group border-b py-2.5 last:border-b-0">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {formatDate(e.entry_date, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                      {e.mood && ` · ${moodLabel(e.mood)}`}
                    </span>
                    <button
                      type="button"
                      aria-label="Delete entry"
                      onClick={() => confirm("Permanently delete this entry?") && remove.mutate(e.id)}
                      className="rounded p-1 opacity-60 hover:bg-muted group-hover:opacity-100"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                  <p className="mt-1 line-clamp-3 text-sm">{plain[e.id]?.body || "Encrypted entry"}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Modal open={changing} title="Change passphrase" onClose={() => setChanging(false)}>
        <ChangePassphrase
          dek={dek}
          userId={userId}
          keys={keys}
          onDone={() => {
            setChanging(false);
            setMessage("Passphrase changed. Your recovery key still works.");
            qc.invalidateQueries({ queryKey: ["journal"] });
          }}
        />
      </Modal>
    </div>
  );
}

function TodayEntry({
  today,
  userId,
  dek,
  existing,
  content,
  onSaved,
}: {
  today: string;
  userId: string;
  dek: Uint8Array;
  existing: api.EntryRow | undefined;
  content: c.EntryContent | undefined;
  onSaved: (message: string) => void;
}) {
  const qc = useQueryClient();
  const [body, setBody] = useState(content?.body ?? "");
  const [gratitude, setGratitude] = useState(content?.gratitude ?? "");
  const [mood, setMood] = useState<number | null>(existing?.mood ?? null);
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: async () => {
      const id = existing?.id ?? crypto.randomUUID();
      const ciphertext = await c.encryptEntry(dek, userId, id, { body, gratitude });
      await api.saveEntry({
        id,
        isNew: !existing,
        entry_date: today,
        mood,
        word_count: wordCount(body) + wordCount(gratitude),
        ciphertext,
      });
    },
    onSuccess: () => onSaved("Saved privately. Only you can read it."),
    onError: (e) => setError(e.message),
    onSettled: () => qc.invalidateQueries({ queryKey: ["journal"] }),
  });

  return (
    <Card>
      <SectionTitle icon={BookHeart} title="A few words, just yours." />
      <p className="border-l-2 border-primary py-1 pl-3 font-serif text-base text-secondary-foreground italic">
        {promptFor(today)}
      </p>
      <form
        className="mt-4 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          save.mutate();
        }}
      >
        <Field label="Your private entry">
          <textarea
            className={`${textareaClass} min-h-48`}
            placeholder="Start anywhere. This is just for you."
            maxLength={20000}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </Field>
        <Field label="Something you're grateful for">
          <Input
            placeholder="It can be a small thing."
            maxLength={300}
            value={gratitude}
            onChange={(e) => setGratitude(e.target.value)}
          />
        </Field>
        <div>
          <p className="mb-2 text-xs font-semibold">Mood, if you like</p>
          <ChoicePills
            label="Mood"
            options={MOODS}
            value={mood}
            onChange={(v) => setMood(v === mood ? null : v)}
          />
        </div>
        {error && <ErrorNote message={error} />}
        <Button type="submit" size="lg" disabled={save.isPending || (!body.trim() && !gratitude.trim())}>
          {save.isPending ? "Encrypting…" : existing ? "Update today's page" : "Save privately"}
        </Button>
      </form>
    </Card>
  );
}

function ChangePassphrase({
  dek,
  userId,
  keys,
  onDone,
}: {
  dek: Uint8Array;
  userId: string;
  keys: c.KeyMaterial;
  onDone: () => void;
}) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      // Re-check the current passphrase so an unattended unlocked tab cannot change it.
      await c.unlockWithPassphrase(current, keys, userId).catch(() => {
        throw new Error("Your current passphrase did not match.");
      });
      await api.updatePassphraseWrap(await c.rewrapDek(dek, next, userId));
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Current passphrase">
        <Input type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
      </Field>
      <Field label="New passphrase" hint={`At least ${c.MIN_PASSPHRASE_LENGTH} characters.`}>
        <Input type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
      </Field>
      {error && <ErrorNote message={error} />}
      <Button type="submit" size="lg" className="w-full" disabled={busy || !current || next.length < c.MIN_PASSPHRASE_LENGTH}>
        {busy ? "Updating…" : "Change passphrase"}
      </Button>
    </form>
  );
}
