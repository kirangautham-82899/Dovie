"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  Check,
  Flame,
  Flag,
  History,
  Pencil,
  Pin,
  PinOff,
  Plus,
  Sparkles,
  Sprout,
  Target,
  TrendingUp,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/modal";
import { ChoicePills, Field } from "@/components/field";
import { EmptyState, ErrorNote, PageHeader, SectionTitle } from "@/components/page-header";
import { Slip, Sticky, StickyValue } from "@/components/notebook";
import { formatAmount } from "@/features/fitness/format";
import { addDays, daysBetween, formatDate, relativeDay } from "@/lib/dates";
import { cn } from "@/lib/utils";
import {
  AREAS,
  HISTORY_DAYS,
  addGoal,
  addGoalProgress,
  addMilestone,
  deleteGoal,
  deleteGoalLog,
  deleteMilestone,
  fetchGoals,
  goalsKey,
  setPinned,
  toggleMilestone,
  updateGoal,
  type Area,
  type Goal,
  type GoalInput,
  type GoalLog,
  type GoalsState,
  type Milestone,
} from "./api";
import { PACE, crossed, isDone, pace, ratio, spark, streaks } from "./pace";

/** Header copy, shared with the loading skeleton so the page doesn't jump. */
export const GOALS_HEADER = {
  eyebrow: "small steps, real growth",
  title: "Things you're",
  accent: "growing.",
};

const AREA_TONE: Record<Area, string> = {
  health: "bg-secondary text-secondary-foreground",
  money: "bg-butter text-butter-foreground",
  balance: "bg-sky text-sky-foreground",
  growth: "bg-lilac text-lilac-foreground",
};

const FILTERS = [{ value: "all", label: "All" }, ...AREAS, { value: "done", label: "Reached" }] as const;
type Filter = (typeof FILTERS)[number]["value"];

/** Starting points for the add dialog: one tap fills the form. */
type Idea = Partial<GoalInput> & { title: string };
const IDEAS: Idea[] = [
  { title: "Read 12 books this year", area: "growth", target: 12, unit: "books", step: 1 },
  { title: "Run 100 km", area: "health", target: 100, unit: "km", step: 5 },
  { title: "Save for a trip", area: "money", target: 50000, unit: "₹", step: 1000 },
  { title: "Meditate 30 times", area: "balance", target: 30, unit: "sessions", step: 1 },
  { title: "Learn 300 new words", area: "growth", target: 300, unit: "words", step: 10 },
  { title: "In bed by 11, 20 nights", area: "balance", target: 20, unit: "nights", step: 1 },
];

const CHEERS: Record<number, string> = {
  25: "A quarter of the way. The start is the hardest part.",
  50: "Halfway there. Look how far you've come.",
  75: "Three quarters done. The finish is in sight.",
  100: "You did it. Take a moment to enjoy this one.",
};

/** "1 book", "3 books": a unit typed in the plural loses its "s" for exactly one. */
const amount = (n: number, unit: string | null) => {
  const u = unit && Math.abs(n) === 1 && /[^s]s$/i.test(unit) ? unit.slice(0, -1) : unit;
  return `${formatAmount(n)}${u ? ` ${u}` : ""}`;
};
const count = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** A progress ring; the number sits in the middle. */
function Ring({ value, size = 56, stroke = 6, children }: { value: number | null; size?: number; stroke?: number; children?: React.ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-muted" />
        {value !== null && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - value)}
            className="stroke-primary transition-[stroke-dashoffset] duration-700 ease-out"
          />
        )}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}

function Spark({ values }: { values: number[] }) {
  const max = Math.max(1, ...values);
  return (
    <div className="flex h-6 items-end gap-px" aria-hidden>
      {values.map((v, i) => (
        <span
          key={i}
          className={cn("w-1.5 rounded-sm", v ? "bg-primary/70" : "bg-muted")}
          style={{ height: `${v ? 25 + (v / max) * 75 : 12}%` }}
        />
      ))}
    </div>
  );
}

function PacePill({ status }: { status: keyof typeof PACE }) {
  const p = PACE[status];
  return <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[0.65rem] font-semibold", p.className)}>{p.label}</span>;
}

/** One line on where a goal stands: days left, what a week needs, or when it lands. */
function paceLine(g: Goal, p: ReturnType<typeof pace>, today: string) {
  if (p.status === "done") return g.completed_at ? `Reached ${relativeDay(g.completed_at.slice(0, 10), today)}` : "Reached";
  if (p.status === "overdue") return `Was due ${formatDate(g.target_date!, { day: "numeric", month: "short" })}, still worth it`;
  if (p.daysLeft !== null && p.perWeekNeeded !== null)
    return `${p.daysLeft} days left · about ${amount(Math.ceil(p.perWeekNeeded * 10) / 10, g.unit)} a week`;
  if (p.eta) return `At this pace, done around ${formatDate(p.eta, { day: "numeric", month: "short", year: "numeric" })}`;
  return g.target_value ? "Log a few steps to see your pace" : "A direction, not a deadline";
}

export function GoalsNotebook({ today }: { today: string }) {
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [dialog, setDialog] = useState<null | "new" | { log: Goal } | { open: string }>(null);
  const [seed, setSeed] = useState<Idea | undefined>();
  const startNew = (idea?: Idea) => {
    setSeed(idea);
    setDialog("new");
  };
  const [cheer, setCheer] = useState<{ title: string; pct: number } | null>(null);
  const query = useQuery({ queryKey: goalsKey(today), queryFn: () => fetchGoals(today) });

  useEffect(() => {
    if (!cheer) return;
    const t = setTimeout(() => setCheer(null), 6000);
    return () => clearTimeout(t);
  }, [cheer]);

  const advanced = query.data?.advanced ?? false;
  const opts = {
    onError: (e: Error) => setError(e.message),
    onSettled: () => qc.invalidateQueries({ queryKey: ["goals"] }),
  };
  const add = useMutation({ mutationFn: (v: GoalInput & { milestones: string[] }) => addGoal(v, advanced), ...opts });
  const update = useMutation({ mutationFn: (v: { id: string; input: GoalInput }) => updateGoal(v.id, v.input, advanced), ...opts });
  const progress = useMutation({
    mutationFn: (v: { goal: Goal; amount: number; note?: string; date?: string }) =>
      addGoalProgress({ id: v.goal.id, amount: v.amount, note: v.note, date: v.date }, advanced),
    onMutate: (v) => {
      // Show the step at once; the server total lands a moment later.
      const key = goalsKey(today);
      const prev = qc.getQueryData<GoalsState>(key);
      if (prev)
        qc.setQueryData<GoalsState>(key, {
          ...prev,
          goals: prev.goals.map((g) => (g.id === v.goal.id ? { ...g, current_value: Math.max(0, g.current_value + v.amount) } : g)),
        });
      const r = ratio(v.goal);
      const after = v.goal.target_value ? Math.min(1, Math.max(0, v.goal.current_value + v.amount) / v.goal.target_value) : null;
      const pct = r !== null && after !== null ? crossed(r, after) : null;
      if (pct) setCheer({ title: v.goal.title, pct });
    },
    ...opts,
  });
  const pin = useMutation({ mutationFn: (v: { id: string; pinned: boolean }) => setPinned(v.id, v.pinned), ...opts });
  const remove = useMutation({ mutationFn: deleteGoal, ...opts });
  const removeLog = useMutation({ mutationFn: deleteGoalLog, ...opts });
  const milestone = {
    add: useMutation({ mutationFn: (v: { goal: string; title: string }) => addMilestone(v.goal, v.title), ...opts }),
    toggle: useMutation({ mutationFn: (v: { id: string; done: boolean }) => toggleMilestone(v.id, v.done), ...opts }),
    remove: useMutation({ mutationFn: deleteMilestone, ...opts }),
  };

  const header = (
    <PageHeader
      compact
      {...GOALS_HEADER}
      eyebrow={query.data ? `goals · ${query.data.goals.filter((g) => !isDone(g)).length} growing` : GOALS_HEADER.eyebrow}
      action={
        <Button variant="solid" onClick={() => startNew()}>
          <Plus /> New goal
        </Button>
      }
    />
  );

  if (query.isPending)
    return (
      <>
        {header}
        <p className="text-sm text-muted-foreground">Gathering your goals…</p>
      </>
    );
  if (query.isError)
    return (
      <>
        {header}
        <ErrorNote message={`Could not load your goals: ${query.error.message}`} onRetry={() => query.refetch()} />
      </>
    );

  const { goals, logs, milestones } = query.data;
  const active = goals.filter((g) => !isDone(g));
  const reached = goals.filter(isDone);
  const withTarget = active.filter((g) => g.target_value);
  const overall = withTarget.length ? withTarget.reduce((s, g) => s + ratio(g)!, 0) / withTarget.length : null;
  const thisWeek = logs.filter((l) => l.amount > 0 && daysBetween(l.log_date, today) < 7).length;
  const lastWeek = logs.filter((l) => l.amount > 0 && daysBetween(l.log_date, today) >= 7 && daysBetween(l.log_date, today) < 14).length;
  const streak = streaks(logs, today);
  const lastLogged = new Map<string, string>();
  for (const l of logs) if (!lastLogged.has(l.goal_id)) lastLogged.set(l.goal_id, l.log_date);
  // The pinned goal, or else the one moved most recently, gets the big card.
  const focus =
    active.find((g) => g.pinned) ??
    [...active].sort((a, b) => (lastLogged.get(b.id) ?? "").localeCompare(lastLogged.get(a.id) ?? ""))[0] ??
    null;
  const shown = (filter === "done" ? reached : filter === "all" ? active : active.filter((g) => g.area === filter)).filter(
    (g) => filter === "done" || g.id !== focus?.id,
  );
  const opened = typeof dialog === "object" && dialog && "open" in dialog ? goals.find((g) => g.id === dialog.open) : undefined;
  const msFor = (id: string) => milestones.filter((m) => m.goal_id === id);
  const step = (g: Goal) => progress.mutate({ goal: g, amount: g.step });

  return (
    <>
      {header}

      {error && (
        <div className="mb-4">
          <ErrorNote message={error} />
        </div>
      )}
      {!advanced && (
        <p className="mb-4 border-l-2 border-butter-foreground/40 py-1 pl-3 text-xs text-muted-foreground">
          Dates, milestones, streaks and history switch on once the latest database migration (goals_plus) has run.
        </p>
      )}

      <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:gap-x-5 md:grid-cols-4">
        <Sticky
          label="Growing"
          icon={Sprout}
          caption={reached.length ? `${reached.length} reached so far` : "one step at a time"}
          tilt="-rotate-1 [--tape-tilt:-4deg]"
          tone="bg-mint text-mint-foreground"
        >
          <StickyValue value={active.length} className="text-3xl sm:text-4xl" />
        </Sticky>
        <Sticky
          label="Overall"
          icon={Target}
          caption={overall === null ? "add a target to see" : "across goals with targets"}
          tilt="rotate-1 [--tape-tilt:3deg]"
          tone="bg-lilac text-lilac-foreground"
        >
          <StickyValue value={overall === null ? "–" : Math.round(overall * 100)} unit={overall === null ? undefined : "%"} className="text-3xl sm:text-4xl" />
        </Sticky>
        <Sticky
          label="This week"
          icon={TrendingUp}
          caption={!advanced ? "history coming soon" : thisWeek > lastWeek ? `up from ${lastWeek} last week` : `${lastWeek} last week`}
          tilt="-rotate-[0.5deg] [--tape-tilt:-2deg]"
          tone="bg-butter text-butter-foreground"
        >
          <StickyValue value={advanced ? thisWeek : "–"} unit={advanced ? (thisWeek === 1 ? "step" : "steps") : undefined} className="text-3xl sm:text-4xl" />
        </Sticky>
        <Sticky
          label="Streak"
          icon={Flame}
          caption={
            !advanced
              ? "history coming soon"
              : streak.current && !streak.loggedToday
                ? "one step today keeps it"
                : `best ${streak.best} ${streak.best === 1 ? "day" : "days"}`
          }
          tilt="rotate-[1.5deg] [--tape-tilt:4deg]"
          tone="bg-blush text-foreground"
        >
          <StickyValue value={advanced ? streak.current : "–"} unit={advanced ? (streak.current === 1 ? "day" : "days") : undefined} className="text-3xl sm:text-4xl" />
        </Sticky>
      </div>

      {cheer && (
        <div role="status" className="animate-rise mt-6 flex items-center gap-3 border border-primary/20 bg-blush px-4 py-3">
          <Sparkles className="size-5 shrink-0 text-primary" />
          <p className="min-w-0 flex-1 text-sm">
            <span className="font-semibold">{cheer.pct}% of {cheer.title}.</span> {CHEERS[cheer.pct]}
          </p>
          <Button size="icon-xs" variant="ghost" aria-label="Dismiss" onClick={() => setCheer(null)}>
            <X />
          </Button>
        </div>
      )}

      <div className="mt-8 space-y-5">
        {goals.length === 0 ? (
          <Slip className="p-5">
            <EmptyState title="Nothing growing yet" detail="Pick an idea to start from, or write your own. A goal can be tiny.">
              <div className="flex flex-wrap gap-2">
                {IDEAS.slice(0, 4).map((idea) => (
                  <Button key={idea.title} size="sm" variant="secondary" onClick={() => startNew(idea)}>
                    {idea.title}
                  </Button>
                ))}
              </div>
            </EmptyState>
          </Slip>
        ) : (
          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
            {focus ? (
              <FocusCard
                goal={focus}
                today={today}
                logs={logs}
                milestones={msFor(focus.id)}
                advanced={advanced}
                onStep={() => step(focus)}
                onLog={() => setDialog({ log: focus })}
                onOpen={() => setDialog({ open: focus.id })}
                onUnpin={() => pin.mutate({ id: focus.id, pinned: false })}
                onToggleMilestone={(m) => milestone.toggle.mutate({ id: m.id, done: !m.done_at })}
              />
            ) : (
              <Slip className="p-5">
                <EmptyState title="Everything reached" detail="Every goal here is done. Time to dream up the next one?" />
              </Slip>
            )}
            {advanced ? <Heatmap logs={logs} today={today} goals={goals} /> : null}
          </div>
        )}

        {goals.length > 0 && (
          <Slip className="p-4 sm:p-5">
            <SectionTitle
              icon={Flag}
              title={filter === "done" ? "Reached" : "All your goals"}
              aside={<ChoicePills label="Show" options={FILTERS} value={filter} onChange={setFilter} />}
            />
            {shown.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {filter === "done" ? "Nothing reached yet, and that's fine." : "Nothing else here right now."}
              </p>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {shown.map((g) => (
                  <GoalCard
                    key={g.id}
                    goal={g}
                    today={today}
                    logs={logs}
                    milestones={msFor(g.id)}
                    advanced={advanced}
                    onStep={() => step(g)}
                    onLog={() => setDialog({ log: g })}
                    onOpen={() => setDialog({ open: g.id })}
                    onPin={() => pin.mutate({ id: g.id, pinned: true })}
                  />
                ))}
              </ul>
            )}
          </Slip>
        )}
      </div>

      <Modal open={dialog === "new"} title="A goal worth growing" onClose={() => setDialog(null)}>
        {dialog === "new" && (
          <GoalForm
            seed={seed}
            advanced={advanced}
            today={today}
            pending={add.isPending}
            submit="Start this goal"
            onSave={(v) => add.mutate(v, { onSuccess: () => setDialog(null) })}
          />
        )}
      </Modal>

      <Modal
        open={typeof dialog === "object" && dialog !== null && "log" in dialog}
        title={typeof dialog === "object" && dialog && "log" in dialog ? `Log progress · ${dialog.log.title}` : ""}
        onClose={() => setDialog(null)}
      >
        {typeof dialog === "object" && dialog && "log" in dialog && (
          <LogForm
            goal={dialog.log}
            today={today}
            advanced={advanced}
            pending={progress.isPending}
            onSave={(v) => progress.mutate({ goal: dialog.log, ...v }, { onSuccess: () => setDialog(null) })}
          />
        )}
      </Modal>

      <Modal open={!!opened} title={opened?.title ?? ""} onClose={() => setDialog(null)}>
        {opened && (
          <GoalDetail
            goal={opened}
            today={today}
            logs={logs.filter((l) => l.goal_id === opened.id)}
            milestones={msFor(opened.id)}
            advanced={advanced}
            saving={update.isPending}
            onSave={(input) => update.mutate({ id: opened.id, input })}
            onPin={() => pin.mutate({ id: opened.id, pinned: !opened.pinned })}
            onRemove={() => {
              if (confirm(`Remove "${opened.title}"?`)) remove.mutate(opened.id, { onSuccess: () => setDialog(null) });
            }}
            onRemoveLog={(id) => removeLog.mutate(id)}
            onAddMilestone={(title) => milestone.add.mutate({ goal: opened.id, title })}
            onToggleMilestone={(m) => milestone.toggle.mutate({ id: m.id, done: !m.done_at })}
            onRemoveMilestone={(id) => milestone.remove.mutate(id)}
          />
        )}
      </Modal>
    </>
  );
}

function FocusCard({
  goal: g,
  today,
  logs,
  milestones,
  advanced,
  onStep,
  onLog,
  onOpen,
  onUnpin,
  onToggleMilestone,
}: {
  goal: Goal;
  today: string;
  logs: GoalLog[];
  milestones: Milestone[];
  advanced: boolean;
  onStep: () => void;
  onLog: () => void;
  onOpen: () => void;
  onUnpin: () => void;
  onToggleMilestone: (m: Milestone) => void;
}) {
  const r = ratio(g);
  const p = pace(g, logs, today);
  const next = milestones.filter((m) => !m.done_at).slice(0, 3);
  return (
    <Slip className="relative overflow-hidden p-5 sm:p-6">
      <div aria-hidden className="pointer-events-none absolute -top-16 -right-16 size-48 rounded-full bg-blush opacity-70 blur-2xl" />
      <div className="relative">
        <div className="mb-4 flex items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-[0.7rem] font-semibold tracking-[0.14em] text-secondary-foreground uppercase">
            <Pin className="size-3" /> {g.pinned ? "Your focus" : "In motion"}
          </p>
          <div className="flex items-center gap-1">
            {p.status !== "open" && <PacePill status={p.status} />}
            {g.pinned && (
              <Button size="icon-xs" variant="ghost" aria-label="Unpin" title="Unpin" onClick={onUnpin}>
                <PinOff />
              </Button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-5">
          <Ring value={r} size={112} stroke={10}>
            <div className="text-center">
              <p className="font-serif text-3xl leading-none">{r === null ? formatAmount(g.current_value) : `${Math.round(r * 100)}%`}</p>
              <p className="mt-1 text-[0.65rem] text-muted-foreground">{r === null ? (g.unit ?? "so far") : "there"}</p>
            </div>
          </Ring>
          <div className="min-w-0 flex-1">
            <button type="button" onClick={onOpen} className="text-left font-serif text-2xl leading-tight tracking-tight hover:underline">
              {g.title}
            </button>
            {g.why && <p className="mt-1 font-hand text-xl leading-tight text-muted-foreground">because {g.why}</p>}
            <p className="mt-2 text-sm">
              {amount(g.current_value, g.unit)}
              {g.target_value ? <span className="text-muted-foreground"> of {formatAmount(g.target_value)}</span> : null}
            </p>
            <p className="text-xs text-muted-foreground">{paceLine(g, p, today)}</p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Button variant="solid" onClick={onStep}>
            <Plus /> {amount(g.step, g.unit)}
          </Button>
          <Button variant="outline" onClick={onLog}>
            <Pencil /> Log with a note
          </Button>
          <Button variant="ghost" onClick={onOpen}>
            <History /> Details
          </Button>
        </div>

        {advanced && (next.length > 0 || milestones.length > 0) && (
          <div className="mt-5 border-t border-dashed pt-3">
            <p className="mb-2 font-hand text-lg leading-none text-muted-foreground">
              next stops · {milestones.filter((m) => m.done_at).length}/{milestones.length} done
            </p>
            <ul className="space-y-1">
              {next.map((m) => (
                <li key={m.id}>
                  <MilestoneCheck milestone={m} onToggle={() => onToggleMilestone(m)} />
                </li>
              ))}
              {next.length === 0 && <li className="text-sm text-muted-foreground">Every milestone ticked off.</li>}
            </ul>
          </div>
        )}
      </div>
    </Slip>
  );
}

function MilestoneCheck({ milestone: m, onToggle }: { milestone: Milestone; onToggle: () => void }) {
  const done = !!m.done_at;
  return (
    <button type="button" role="checkbox" aria-checked={done} onClick={onToggle} className="group flex w-full items-center gap-2 text-left text-sm">
      <span
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors",
          done ? "border-primary bg-primary text-primary-foreground" : "group-hover:border-primary",
        )}
      >
        {done && <Check className="size-3" />}
      </span>
      <span className={cn("min-w-0 flex-1 truncate", done && "text-muted-foreground line-through")}>{m.title}</span>
    </button>
  );
}

function GoalCard({
  goal: g,
  today,
  logs,
  milestones,
  advanced,
  onStep,
  onLog,
  onOpen,
  onPin,
}: {
  goal: Goal;
  today: string;
  logs: GoalLog[];
  milestones: Milestone[];
  advanced: boolean;
  onStep: () => void;
  onLog: () => void;
  onOpen: () => void;
  onPin: () => void;
}) {
  const r = ratio(g);
  const p = pace(g, logs, today);
  const done = isDone(g);
  const msDone = milestones.filter((m) => m.done_at).length;
  return (
    <li className="group flex flex-col gap-3 border bg-card p-4 transition-shadow hover:shadow-soft">
      <div className="flex items-start gap-3">
        <Ring value={r ?? (done ? 1 : null)} size={48} stroke={5}>
          <span className="text-[0.7rem] font-semibold tabular-nums">{r === null ? formatAmount(g.current_value) : `${Math.round(r * 100)}%`}</span>
        </Ring>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-1">
            {g.area && (
              <span className={cn("rounded-full px-2 py-0.5 text-[0.65rem] font-semibold", AREA_TONE[g.area])}>
                {AREAS.find((a) => a.value === g.area)?.label}
              </span>
            )}
            {p.status !== "open" && <PacePill status={p.status} />}
          </div>
          <button type="button" onClick={onOpen} className="block max-w-full text-left font-medium break-words hover:underline">
            {g.title}
          </button>
          <p className="text-xs text-muted-foreground">
            {amount(g.current_value, g.unit)}
            {g.target_value ? ` of ${formatAmount(g.target_value)}` : ""}
            {advanced && milestones.length > 0 && ` · ${msDone}/${milestones.length} milestones`}
          </p>
        </div>
        {advanced && !done && (
          <Button
            size="icon-xs"
            variant="ghost"
            aria-label={`Make ${g.title} your focus`}
            title="Make this your focus"
            onClick={onPin}
            className="text-muted-foreground [@media(hover:hover)]:opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
          >
            <Pin />
          </Button>
        )}
      </div>
      {advanced && <Spark values={spark(g.id, logs, today)} />}
      <p className="text-xs text-muted-foreground">{paceLine(g, p, today)}</p>
      {!done && (
        <div className="mt-auto flex gap-1.5">
          <Button size="sm" variant="secondary" onClick={onStep} aria-label={`Add ${amount(g.step, g.unit)} to ${g.title}`}>
            <Plus /> {amount(g.step, g.unit)}
          </Button>
          <Button size="sm" variant="ghost" onClick={onLog}>
            Log…
          </Button>
        </div>
      )}
    </li>
  );
}

/** Sixteen weeks of steps across every goal, one square a day. */
function Heatmap({ logs, today, goals }: { logs: GoalLog[]; today: string; goals: Goal[] }) {
  const counts = new Map<string, number>();
  for (const l of logs) if (l.amount > 0) counts.set(l.log_date, (counts.get(l.log_date) ?? 0) + 1);
  const weeks = HISTORY_DAYS / 7;
  // End on this week's Sunday so columns are whole Monday-to-Sunday weeks.
  const weekday = (new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7;
  const start = addDays(today, -weekday - (weeks - 1) * 7);
  const max = Math.max(1, ...counts.values());
  const total = [...counts.values()].reduce((s, n) => s + n, 0);
  const activeDays = counts.size;
  const level = (n: number) => (n === 0 ? 0 : Math.min(4, Math.ceil((n / max) * 4)));
  const tone = ["bg-muted", "bg-primary/25", "bg-primary/45", "bg-primary/70", "bg-primary"];
  const recent = logs.slice(0, 4);
  const titleOf = new Map(goals.map((g) => [g.id, g]));

  return (
    <Slip className="p-4 sm:p-5">
      <SectionTitle
        icon={CalendarDays}
        title="Your rhythm"
        aside={<span className="text-xs text-muted-foreground">{count(total, "step")} · {count(activeDays, "day")}</span>}
      />
      <div className="overflow-x-auto">
        <div className="grid w-max grid-flow-col grid-rows-7 gap-[3px]" role="img" aria-label={`${total} steps logged over ${weeks} weeks`}>
          {Array.from({ length: weeks * 7 }, (_, i) => {
            const d = addDays(start, i);
            const n = counts.get(d) ?? 0;
            return (
              <span
                key={d}
                title={`${formatDate(d, { day: "numeric", month: "short" })}: ${n} ${n === 1 ? "step" : "steps"}`}
                className={cn("size-3 rounded-[3px]", d > today ? "bg-transparent" : tone[level(n)], d === today && "ring-1 ring-primary")}
              />
            );
          })}
        </div>
      </div>
      <div className="mt-2 flex items-center justify-end gap-1 text-[0.65rem] text-muted-foreground">
        less
        {tone.map((t) => (
          <span key={t} className={cn("size-2.5 rounded-[2px]", t)} />
        ))}
        more
      </div>

      {recent.length > 0 && (
        <ul className="mt-3 space-y-1.5 border-t border-dashed pt-3">
          {recent.map((l) => {
            const g = titleOf.get(l.goal_id);
            return (
              <li key={l.id} className="flex items-baseline gap-2 text-xs">
                <span className={cn("font-semibold tabular-nums", l.amount > 0 ? "text-primary" : "text-muted-foreground")}>
                  {l.amount > 0 ? "+" : ""}
                  {amount(l.amount, g?.unit ?? null)}
                </span>
                <span className="min-w-0 flex-1 truncate">
                  {g?.title ?? "A goal"}
                  {l.note && <span className="text-muted-foreground"> · {l.note}</span>}
                </span>
                <span className="shrink-0 text-muted-foreground">{relativeDay(l.log_date, today)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </Slip>
  );
}

function LogForm({
  goal,
  today,
  advanced,
  pending,
  onSave,
}: {
  goal: Goal;
  today: string;
  advanced: boolean;
  pending: boolean;
  onSave: (v: { amount: number; note?: string; date?: string }) => void;
}) {
  const [value, setValue] = useState(formatAmount(goal.step));
  const [note, setNote] = useState("");
  const [date, setDate] = useState(today);
  const n = Number(value);
  const valid = value !== "" && Number.isFinite(n) && n !== 0 && Math.abs(n) <= 1_000_000_000;
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onSave({ amount: n, note: note.trim() || undefined, date });
      }}
    >
      <Field label={`How much${goal.unit ? ` (${goal.unit})` : ""}?`} hint="Use a minus to take some back.">
        <div className="flex gap-2">
          <Input type="number" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} />
          {[1, 2, 5].map((k) => (
            <Button key={k} type="button" variant="secondary" onClick={() => setValue(formatAmount(goal.step * k))}>
              {formatAmount(goal.step * k)}
            </Button>
          ))}
        </div>
      </Field>
      {advanced && (
        <>
          <Field label="A note" hint="Optional">
            <Input placeholder="Finished chapter 9 on the train" maxLength={140} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          <Field label="When">
            <Input type="date" max={today} value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </>
      )}
      <Button type="submit" size="lg" className="w-full" loading={pending} disabled={!valid}>
        Log it
      </Button>
    </form>
  );
}

function GoalForm({
  initial,
  seed,
  advanced,
  today,
  pending,
  submit,
  onSave,
}: {
  initial?: Goal;
  seed?: Idea;
  advanced: boolean;
  today: string;
  pending: boolean;
  submit: string;
  onSave: (v: GoalInput & { milestones: string[] }) => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? seed?.title ?? "");
  const [area, setArea] = useState<Area | null>(initial?.area ?? seed?.area ?? null);
  const startTarget = initial ? initial.target_value : seed?.target;
  const [target, setTarget] = useState(startTarget != null ? String(startTarget) : "");
  const [unit, setUnit] = useState(initial?.unit ?? seed?.unit ?? "");
  const [stepRaw, setStepRaw] = useState(String(initial?.step ?? seed?.step ?? 1));
  const [date, setDate] = useState(initial?.target_date ?? "");
  const [why, setWhy] = useState(initial?.why ?? "");
  const [steps, setSteps] = useState("");
  const targetNum = target === "" ? null : Number(target);
  const stepNum = Number(stepRaw);
  const valid =
    title.trim() &&
    (targetNum === null || (targetNum > 0 && targetNum <= 1_000_000_000)) &&
    Number.isFinite(stepNum) &&
    stepNum > 0 &&
    (!date || targetNum !== null);

  const pickIdea = (idea: Idea) => {
    setTitle(idea.title);
    setArea(idea.area ?? null);
    setTarget(idea.target != null ? String(idea.target) : "");
    setUnit(idea.unit ?? "");
    setStepRaw(String(idea.step ?? 1));
  };

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid)
          onSave({
            title,
            area,
            target: targetNum,
            unit,
            step: stepNum,
            target_date: date,
            why,
            milestones: steps.split("\n"),
          });
      }}
    >
      {!initial && (
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold">
            <Sparkles className="size-3.5 text-primary" /> Start from an idea
          </p>
          <div className="flex flex-wrap gap-1.5">
            {IDEAS.map((idea) => (
              <button
                key={idea.title}
                type="button"
                onClick={() => pickIdea(idea)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs transition-colors hover:border-primary/40 hover:bg-secondary",
                  title === idea.title && "border-primary bg-secondary",
                )}
              >
                {idea.title}
              </button>
            ))}
          </div>
        </div>
      )}
      <Field label="What are you growing toward?">
        <Input placeholder="Read 12 books this year" maxLength={100} value={title} onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <div>
        <p className="mb-2 text-xs font-semibold">Area</p>
        <ChoicePills label="Area" options={AREAS} value={area} onChange={setArea} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Target" hint="Optional">
          <Input type="number" inputMode="decimal" min={0} value={target} onChange={(e) => setTarget(e.target.value)} />
        </Field>
        <Field label="Unit" hint="Optional">
          <Input placeholder="books" maxLength={20} value={unit} onChange={(e) => setUnit(e.target.value)} />
        </Field>
        <Field label="One step" hint="Per tap">
          <Input type="number" inputMode="decimal" min={0} value={stepRaw} onChange={(e) => setStepRaw(e.target.value)} />
        </Field>
      </div>
      {advanced && (
        <>
          <Field label="By when" hint={targetNum === null ? "Needs a target" : "Optional"}>
            <Input type="date" min={today} value={date} disabled={targetNum === null} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Why it matters" hint="Optional. Shown on your focus card.">
            <Input placeholder="I want evenings that feel like mine" maxLength={200} value={why} onChange={(e) => setWhy(e.target.value)} />
          </Field>
          {!initial && (
            <Field label="Milestones" hint="Optional, one per line">
              <textarea
                rows={3}
                placeholder={"Finish the first book\nJoin a book club"}
                value={steps}
                onChange={(e) => setSteps(e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </Field>
          )}
        </>
      )}
      <Button type="submit" size="lg" className="w-full" loading={pending} disabled={!valid}>
        {submit}
      </Button>
    </form>
  );
}

function GoalDetail({
  goal: g,
  today,
  logs,
  milestones,
  advanced,
  saving,
  onSave,
  onPin,
  onRemove,
  onRemoveLog,
  onAddMilestone,
  onToggleMilestone,
  onRemoveMilestone,
}: {
  goal: Goal;
  today: string;
  logs: GoalLog[];
  milestones: Milestone[];
  advanced: boolean;
  saving: boolean;
  onSave: (v: GoalInput) => void;
  onPin: () => void;
  onRemove: () => void;
  onRemoveLog: (id: string) => void;
  onAddMilestone: (title: string) => void;
  onToggleMilestone: (m: Milestone) => void;
  onRemoveMilestone: (id: string) => void;
}) {
  const [tab, setTab] = useState<"journey" | "edit">("journey");
  const [newStep, setNewStep] = useState("");
  const p = pace(g, logs, today);

  return (
    <div className="space-y-4">
      <ChoicePills
        label="Section"
        options={[
          { value: "journey", label: "Journey" },
          { value: "edit", label: "Edit" },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === "edit" ? (
        <GoalForm initial={g} advanced={advanced} today={today} pending={saving} submit="Save changes" onSave={onSave} />
      ) : (
        <>
          <div className="flex items-center gap-4">
            <Ring value={ratio(g)} size={72} stroke={7}>
              <span className="text-sm font-semibold">{ratio(g) === null ? formatAmount(g.current_value) : `${Math.round(ratio(g)! * 100)}%`}</span>
            </Ring>
            <div className="min-w-0 text-sm">
              <p>
                {amount(g.current_value, g.unit)}
                {g.target_value ? ` of ${formatAmount(g.target_value)}` : ""}
              </p>
              <p className="text-xs text-muted-foreground">{paceLine(g, p, today)}</p>
              {g.why && <p className="mt-1 font-hand text-lg leading-tight text-muted-foreground">because {g.why}</p>}
            </div>
          </div>

          {advanced && (
            <section>
              <p className="mb-2 text-xs font-semibold">Milestones</p>
              <ul className="space-y-1">
                {milestones.map((m) => (
                  <li key={m.id} className="group flex items-center gap-1">
                    <MilestoneCheck milestone={m} onToggle={() => onToggleMilestone(m)} />
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      aria-label={`Remove ${m.title}`}
                      onClick={() => onRemoveMilestone(m.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X />
                    </Button>
                  </li>
                ))}
              </ul>
              <form
                className="mt-2 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newStep.trim()) return;
                  onAddMilestone(newStep);
                  setNewStep("");
                }}
              >
                <Input aria-label="New milestone" placeholder="Add a milestone…" maxLength={80} className="h-8 text-sm" value={newStep} onChange={(e) => setNewStep(e.target.value)} />
                <Button type="submit" size="icon-sm" variant="secondary" aria-label="Add milestone" disabled={!newStep.trim()}>
                  <Plus />
                </Button>
              </form>
            </section>
          )}

          {advanced && (
            <section>
              <p className="mb-2 text-xs font-semibold">History</p>
              {logs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No steps logged in the last {HISTORY_DAYS / 7} weeks.</p>
              ) : (
                <ul className="max-h-56 divide-y overflow-y-auto">
                  {logs.map((l) => (
                    <li key={l.id} className="group flex items-center gap-2 py-1.5 text-sm">
                      <span className={cn("w-16 shrink-0 font-semibold tabular-nums", l.amount > 0 ? "text-primary" : "text-muted-foreground")}>
                        {l.amount > 0 ? "+" : ""}
                        {formatAmount(l.amount)}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-muted-foreground">{l.note ?? ""}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{formatDate(l.log_date, { day: "numeric", month: "short" })}</span>
                      <button
                        type="button"
                        aria-label="Remove this step"
                        onClick={() => onRemoveLog(l.id)}
                        className="flex size-6 items-center justify-center rounded-full text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive [@media(hover:hover)]:opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          <div className="flex flex-wrap gap-2 border-t pt-4">
            {advanced && !isDone(g) && (
              <Button variant="outline" onClick={onPin}>
                {g.pinned ? <PinOff /> : <Pin />} {g.pinned ? "Unpin" : "Make it my focus"}
              </Button>
            )}
            <Button variant="destructive" onClick={onRemove} className="ml-auto">
              <Trash2 /> Remove goal
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
