"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Search, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorNote } from "@/components/page-header";
import { MOODS, moodLabel } from "@/features/checkin/mood";
import { addDays, formatDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import * as api from "./api";

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

/** The first line of a page, for the contents list. */
function firstLine(e: api.EntryRow) {
  if (api.isOlderPage(e)) return "Saved in the older private journal";
  const line = (e.body ?? "").trim().split("\n")[0] || e.gratitude || "";
  return line || "A blank page";
}

export function JournalScreen({ today }: { today: string }) {
  const query = useQuery({ queryKey: ["journal"], queryFn: api.fetchJournal });

  if (query.isPending) return <p className="text-sm text-muted-foreground">Opening your journal…</p>;
  if (query.isError) return <ErrorNote message={query.error.message} onRetry={() => query.refetch()} />;
  return <Book today={today} entries={query.data} />;
}

/** An open book: the contents on the left page, the day being written on the right. */
function Book({ today, entries }: { today: string; entries: api.EntryRow[] }) {
  const qc = useQueryClient();
  const [selected, setSelected] = useState(today);
  const [search, setSearch] = useState("");
  const dirty = useRef(false);
  const setDirty = useCallback((d: boolean) => {
    dirty.current = d;
  }, []);

  const remove = useMutation({
    mutationFn: api.deleteEntry,
    onSettled: () => qc.invalidateQueries({ queryKey: ["journal"] }),
  });

  /** Turns to another day, asking first if the page in front of you has unsaved words. */
  function open(day: string) {
    if (day === selected) return;
    if (dirty.current && !confirm("Leave this page without saving?")) return;
    dirty.current = false;
    setSelected(day);
  }

  const monthAgo = entries.find((e) => e.entry_date === addDays(today, -30) && e.body);
  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) => `${e.body ?? ""} ${e.gratitude ?? ""} ${moodLabel(e.mood)}`.toLowerCase().includes(q));
  }, [entries, search]);

  return (
    <div className="book mb-2 lg:grid lg:grid-cols-2">
      <section aria-label="Your pages" className="grid-paper book-left order-2 border-t p-6 lg:order-1 lg:border-t-0">
        <header className="min-h-24">
          <p className="eyebrow">Contents</p>
          <h2 className="font-serif text-2xl leading-tight tracking-tight">
            <span className="highlighter -mx-1 px-1">Your pages</span>
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {entries.length === 0 ? "Nothing written yet." : `${entries.length} ${entries.length === 1 ? "page" : "pages"} so far`}
          </p>
        </header>

        <label className="flex h-12 items-center gap-3 border-t border-foreground/10 focus-within:bg-secondary/40">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            placeholder="Search your pages"
            aria-label="Search your pages"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
          />
        </label>

        <ul className="max-h-[36rem] overflow-y-auto">
          {monthAgo && !search && (
            <li className="h-12 border-t border-foreground/10">
              <button type="button" onClick={() => open(monthAgo.entry_date)} className="flex h-full w-full items-center gap-3 text-left hover:bg-secondary/40">
                <Sparkles className="size-4 shrink-0 text-chart-2" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[0.65rem] leading-4 font-semibold tracking-wide text-muted-foreground uppercase">A month ago</span>
                  <span className="block truncate font-serif text-sm leading-5 italic">&ldquo;{firstLine(monthAgo)}&rdquo;</span>
                </span>
              </button>
            </li>
          )}
          {shown.length === 0 && (
            <li className="flex h-12 items-center border-t border-foreground/10 text-sm text-muted-foreground">
              {search ? "Nothing matches that." : "Your pages will gather here."}
            </li>
          )}
          {shown.map((e) => (
            <li key={e.id} className={cn("group flex h-12 items-center border-t border-foreground/10", e.entry_date === selected && "bg-primary/10")}>
              <button
                type="button"
                aria-current={e.entry_date === selected ? "page" : undefined}
                onClick={() => open(e.entry_date)}
                className="min-w-0 flex-1 self-stretch text-left"
              >
                <span className="flex h-full min-w-0 flex-col justify-center">
                  <span className="text-[0.65rem] leading-4 font-semibold tracking-wide text-muted-foreground uppercase">
                    {formatDate(e.entry_date, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                    {e.mood && ` · ${moodLabel(e.mood)}`}
                  </span>
                  <span className={cn("truncate text-sm leading-5", api.isOlderPage(e) && "text-muted-foreground italic")}>{firstLine(e)}</span>
                </span>
              </button>
              <button
                type="button"
                aria-label={`Delete the page for ${formatDate(e.entry_date, { day: "numeric", month: "long" })}`}
                onClick={() => confirm("Permanently delete this page?") && remove.mutate(e.id)}
                className="p-2 opacity-50 hover:bg-muted group-hover:opacity-100 focus-visible:opacity-100"
              >
                <Trash2 className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
        {remove.isError && <ErrorNote message={remove.error.message} />}
      </section>

      <Page
        key={selected}
        day={selected}
        today={today}
        existing={entries.find((e) => e.entry_date === selected)}
        onGo={open}
        onDirty={setDirty}
      />
    </div>
  );
}

/** The right page: one day to write on. */
function Page({
  day,
  today,
  existing,
  onGo,
  onDirty,
}: {
  day: string;
  today: string;
  existing: api.EntryRow | undefined;
  onGo: (day: string) => void;
  onDirty: (dirty: boolean) => void;
}) {
  const qc = useQueryClient();
  const older = !!existing && api.isOlderPage(existing);
  const [body, setBody] = useState(existing?.body ?? "");
  const [gratitude, setGratitude] = useState(existing?.gratitude ?? "");
  const [mood, setMood] = useState<number | null>(existing?.mood ?? null);
  // The id of a row this page created, so a second save before the list refreshes updates it instead of inserting twice.
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const words = wordCount(body) + wordCount(gratitude);
  const rowId = existing?.id ?? createdId;

  const changed = body !== (existing?.body ?? "") || gratitude !== (existing?.gratitude ?? "") || mood !== (existing?.mood ?? null);
  useEffect(() => {
    onDirty(changed && !saved);
    return () => onDirty(false);
  }, [changed, saved, onDirty]);

  const save = useMutation({
    mutationFn: async () => {
      const id = rowId ?? crypto.randomUUID();
      await api.saveEntry({ id, isNew: !rowId, entry_date: day, mood, word_count: words, body, gratitude });
      return id;
    },
    onSuccess: (id) => {
      setCreatedId(id);
      setSaved(true);
    },
    onError: (e) => setError(e.message),
    onSettled: () => qc.invalidateQueries({ queryKey: ["journal"] }),
  });

  const isToday = day === today;

  return (
    <form
      className="grid-paper book-right order-1 p-6 lg:order-2 lg:border-l"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        save.mutate();
      }}
    >
      <header className="flex min-h-24 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow">{isToday ? "Today's page" : "A page from"}</p>
          <h2 className="font-serif text-2xl leading-tight tracking-tight">
            <span className="highlighter -mx-1 px-1">{formatDate(day, { weekday: "long", day: "numeric", month: "long" })}</span>
          </h2>
          {!isToday && <p className="mt-0.5 text-xs text-muted-foreground">{formatDate(day, { year: "numeric" })}</p>}
        </div>
        <nav aria-label="Turn the page" className="flex shrink-0 items-center gap-0.5">
          <Button type="button" size="icon-sm" variant="ghost" aria-label="Previous page" onClick={() => onGo(addDays(day, -1))}>
            <ChevronLeft />
          </Button>
          {!isToday && (
            <Button type="button" size="xs" variant="secondary" onClick={() => onGo(today)}>
              Today
            </Button>
          )}
          <Button type="button" size="icon-sm" variant="ghost" aria-label="Next page" disabled={day >= today} onClick={() => onGo(addDays(day, 1))}>
            <ChevronRight />
          </Button>
        </nav>
      </header>

      {older ? (
        <p className="min-h-12 text-xs leading-6 text-muted-foreground">
          This page was saved in the older, passphrase-encrypted journal and can&apos;t be opened here. Writing on it replaces it.
        </p>
      ) : (
        <p className="min-h-12 font-serif text-base leading-6 text-secondary-foreground italic">{promptFor(day)}</p>
      )}

      <p className="flex h-6 items-end font-hand text-xl leading-none text-secondary-foreground">how are you feeling?</p>
      <div role="radiogroup" aria-label="Mood" className="flex h-12 items-center gap-1.5">
        {MOODS.map((m) => (
          <button
            key={m.value}
            type="button"
            role="radio"
            aria-checked={mood === m.value}
            onClick={() => {
              setMood(mood === m.value ? null : m.value);
              setSaved(false);
            }}
            className={cn(
              "h-7 border px-2.5 text-xs font-medium transition-colors",
              mood === m.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-foreground/20 bg-card/70 text-muted-foreground hover:border-primary hover:bg-secondary",
            )}
          >
            {m.label}
          </button>
        ))}
      </div>

      <textarea
        aria-label="Write anything"
        placeholder="Write anything. This is just for you."
        maxLength={20000}
        value={body}
        onChange={(e) => {
          setBody(e.target.value);
          setSaved(false);
        }}
        className="block min-h-96 w-full resize-none bg-transparent text-base leading-6 outline-none [field-sizing:content] placeholder:text-muted-foreground/60"
      />

      <label className="flex h-12 items-center gap-3 border-t border-foreground/10">
        <span className="shrink-0 font-hand text-xl leading-none text-secondary-foreground">grateful for</span>
        <input
          placeholder="something small…"
          maxLength={300}
          value={gratitude}
          onChange={(e) => {
            setGratitude(e.target.value);
            setSaved(false);
          }}
          className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
        />
      </label>

      {error && <ErrorNote message={error} />}
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground" aria-live="polite">
          {saved ? "Saved." : `${words} ${words === 1 ? "word" : "words"}`}
        </span>
        <Button type="submit" disabled={save.isPending || (!body.trim() && !gratitude.trim() && mood === null) || (!changed && !older)}>
          {save.isPending ? "Saving…" : existing || createdId ? "Update this page" : "Save this page"}
        </Button>
      </div>
    </form>
  );
}
