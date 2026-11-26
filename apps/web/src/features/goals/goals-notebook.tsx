"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Flame, Flag, Plus, Sparkles, Sprout, Target, TrendingUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/modal";
import { ChoicePills } from "@/components/field";
import { EmptyState, ErrorNote, PageHeader, SectionTitle } from "@/components/page-header";
import { Slip, Sticky, StickyValue } from "@/components/notebook";
import { daysBetween } from "@/lib/dates";
import { AREAS, addGoal, addGoalProgress, addMilestone, deleteGoal, deleteGoalLog, deleteMilestone, fetchGoals, goalsKey, setPinned, toggleMilestone, updateGoal, type Goal, type GoalInput, type GoalsState } from "./api";
import { crossed, isDone, ratio, streaks } from "./pace";
import { CHEERS } from "./goal-parts";
import { FocusCard, GoalCard, Heatmap } from "./goal-cards";
import { GoalForm, LogForm } from "./goal-forms";
import { GoalDetail } from "./goal-detail";

/** Header copy, shared with the loading skeleton so the page doesn't jump. */
export const GOALS_HEADER = {
  eyebrow: "small steps, real growth",
  title: "Things you're",
  accent: "growing.",
};

const FILTERS = [{ value: "all", label: "All" }, ...AREAS, { value: "done", label: "Reached" }] as const;

type Filter = (typeof FILTERS)[number]["value"];

/** Starting points for the add dialog: one tap fills the form. */
export type Idea = Partial<GoalInput> & { title: string };

export const IDEAS: Idea[] = [
  { title: "Read 12 books this year", area: "growth", target: 12, unit: "books", step: 1 },
  { title: "Run 100 km", area: "health", target: 100, unit: "km", step: 5 },
  { title: "Save for a trip", area: "money", target: 50000, unit: "₹", step: 1000 },
  { title: "Meditate 30 times", area: "balance", target: 30, unit: "sessions", step: 1 },
  { title: "Learn 300 new words", area: "growth", target: 300, unit: "words", step: 10 },
  { title: "In bed by 11, 20 nights", area: "balance", target: 20, unit: "nights", step: 1 },
];

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
