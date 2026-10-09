"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TaskItem } from "./task-item";
import { useTasks } from "./use-tasks";
import { MAX_PRIORITIES, MAX_TITLE_LENGTH, type Task } from "./types";

/** Unfinished tasks first, then finished ones; creation order within each group. */
function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const doneDiff = Number(a.completed_at !== null) - Number(b.completed_at !== null);
    return doneDiff || a.created_at.localeCompare(b.created_at);
  });
}

export function TasksSection({ today }: { today: string }) {
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const { query, add, toggle, prioritise, rename, remove } = useTasks(today, setError);

  const tasks = query.data ?? [];
  const priorities = sortTasks(tasks.filter((t) => t.is_priority));
  const others = sortTasks(tasks.filter((t) => !t.is_priority));
  const doneCount = tasks.filter((t) => t.completed_at !== null).length;
  const locked = priorities.length >= MAX_PRIORITIES;

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
      <Card aria-busy="true">
        <CardContent className="py-6 text-sm text-muted-foreground">Loading your tasks...</CardContent>
      </Card>
    );
  }

  if (query.isError) {
    return (
      <Card>
        <CardContent className="space-y-3 py-6 text-sm">
          <p className="text-destructive">Could not load your tasks: {query.error.message}</p>
          <Button size="sm" variant="outline" onClick={() => query.refetch()}>
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Top priorities</CardTitle>
          <span className="text-xs text-muted-foreground">
            {priorities.length}/{MAX_PRIORITIES}
          </span>
        </CardHeader>
        <CardContent>
          {priorities.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Tap the star on a task to make it one of today&apos;s top {MAX_PRIORITIES}.
            </p>
          ) : (
            <ul>{priorities.map(renderItem)}</ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">To-dos</CardTitle>
          {tasks.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {doneCount} of {tasks.length} done
            </span>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          <form onSubmit={submit} className="flex gap-2">
            <Input
              aria-label="New task"
              placeholder="Add a task"
              maxLength={MAX_TITLE_LENGTH}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
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

          {others.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {tasks.length === 0 ? "Nothing planned yet. Add your first task." : "No other tasks."}
            </p>
          ) : (
            <ul>{others.map(renderItem)}</ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}
