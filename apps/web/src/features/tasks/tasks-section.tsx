"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TaskItem } from "./task-item";
import { useTasks } from "./use-tasks";
import { MAX_PRIORITIES, MAX_TITLE_LENGTH, type Task } from "./types";

/** Unfinished first, starred ones ahead of the rest, then creation order. */
function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const doneDiff = Number(a.completed_at !== null) - Number(b.completed_at !== null);
    return doneDiff || Number(b.is_priority) - Number(a.is_priority) || a.created_at.localeCompare(b.created_at);
  });
}

/** Today's plans as a checklist. The top three live in the Planner; a star here pins a plan there. */
export function TasksSection({ today }: { today: string }) {
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const { query, add, toggle, prioritise, rename, remove } = useTasks(today, setError);

  const tasks = sortTasks(query.data ?? []);
  const doneCount = tasks.filter((t) => t.completed_at !== null).length;
  const locked = tasks.filter((t) => t.is_priority).length >= MAX_PRIORITIES;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = title.trim();
    if (!value) return;
    setError(null);
    add.mutate({ title: value, isPriority: false }, { onSuccess: () => setTitle("") });
  }

  function renderItem(task: Task) {
    return (
      <TaskItem
        key={task.id}
        task={task}
        priorityLocked={locked}
        onToggle={(done) => {
          setError(null);
          toggle.mutate({ id: task.id, done });
        }}
        onPriority={(value) => {
          setError(null);
          prioritise.mutate({ id: task.id, value });
        }}
        onRename={(next) => {
          setError(null);
          rename.mutate({ id: task.id, title: next });
        }}
        onDelete={() => {
          setError(null);
          remove.mutate(task.id);
        }}
      />
    );
  }

  if (query.isPending) {
    return (
      <section aria-busy="true" className="py-2 text-sm text-muted-foreground">
        Loading your tasks...
      </section>
    );
  }

  if (query.isError) {
    return (
      <section className="space-y-3 py-2 text-sm">
        <p className="text-destructive">Could not load your tasks: {query.error.message}</p>
        <Button size="sm" variant="outline" onClick={() => query.refetch()}>
          Try again
        </Button>
      </section>
    );
  }

  return (
    <section aria-labelledby="todo-title" className="space-y-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="todo-title" className="font-serif text-2xl tracking-tight">
          To do today
        </h2>
        {tasks.length > 0 && (
          <span className="font-hand text-xl text-muted-foreground">
            {doneCount} of {tasks.length} done
          </span>
        )}
      </div>

      <form onSubmit={submit} className="flex gap-2">
        <Input
          aria-label="New task"
          placeholder="Add a small plan…"
          maxLength={MAX_TITLE_LENGTH}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="bg-card"
        />
        <Button type="submit" size="icon" aria-label="Add task" disabled={add.isPending || !title.trim()}>
          <Plus />
        </Button>
      </form>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {tasks.length === 0 ? (
        <p className="font-hand text-xl text-muted-foreground">A clear page. Add one small plan above.</p>
      ) : (
        <ul className="[&>li]:border-b [&>li]:border-dashed">{tasks.map(renderItem)}</ul>
      )}
    </section>
  );
}
