"use client";

import { useState } from "react";
import { Check, Pencil, Repeat, Star, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { MAX_TITLE_LENGTH, type Task } from "./types";

type Props = {
  task: Task;
  /** True when the day already has 3 priorities and this task is not one of them. */
  priorityLocked: boolean;
  onToggle: (done: boolean) => void;
  onPriority: (value: boolean) => void;
  onRename: (title: string) => void;
  onDelete: () => void;
};

export function TaskItem({ task, priorityLocked, onToggle, onPriority, onRename, onDelete }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.title);
  const done = task.completed_at !== null;

  function startEdit() {
    setDraft(task.title);
    setEditing(true);
  }

  function commit() {
    const title = draft.trim();
    setEditing(false);
    if (title && title !== task.title) onRename(title);
  }

  return (
    <li className="flex items-center gap-2 rounded-xl px-1 py-1.5">
      <button
        type="button"
        role="checkbox"
        aria-checked={done}
        aria-label={done ? `Mark "${task.title}" as not done` : `Mark "${task.title}" as done`}
        onClick={() => onToggle(!done)}
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-full border transition-colors",
          done ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary",
        )}
      >
        {done && <Check className="size-4" aria-hidden />}
      </button>

      {editing ? (
        <form
          className="flex flex-1 items-center gap-1"
          onSubmit={(e) => {
            e.preventDefault();
            commit();
          }}
        >
          <Input
            autoFocus
            aria-label="Task title"
            maxLength={MAX_TITLE_LENGTH}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setEditing(false)}
            className="h-8"
          />
          <Button type="submit" size="icon-sm" variant="ghost" aria-label="Save">
            <Check />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label="Cancel"
            onClick={() => setEditing(false)}
          >
            <X />
          </Button>
        </form>
      ) : (
        <>
          <span className={cn("min-w-0 flex-1 break-words text-sm", done && "text-muted-foreground line-through")}>
            {task.title}
            {task.carry_count > 0 && !done && (
              <span className="ml-2 inline-flex items-center gap-0.5 rounded-full bg-accent px-1.5 py-0.5 align-middle text-[0.65rem] text-accent-foreground">
                <Repeat className="size-3" aria-hidden />
                {task.carry_count === 1 ? "carried over" : `carried ${task.carry_count}x`}
              </span>
            )}
          </span>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={task.is_priority ? "Remove from priorities" : "Make a priority"}
            aria-pressed={task.is_priority}
            disabled={priorityLocked && !task.is_priority}
            title={priorityLocked && !task.is_priority ? "You already have 3 priorities today" : undefined}
            onClick={() => onPriority(!task.is_priority)}
          >
            <Star className={cn(task.is_priority && "fill-primary text-primary")} />
          </Button>
          <Button size="icon-sm" variant="ghost" aria-label="Edit task" onClick={startEdit}>
            <Pencil />
          </Button>
          <Button size="icon-sm" variant="ghost" aria-label="Delete task" onClick={onDelete}>
            <Trash2 />
          </Button>
        </>
      )}
    </li>
  );
}
