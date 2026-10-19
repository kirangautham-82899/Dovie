"use client";

import { useEffect, useRef, useState } from "react";
import { PencilLine } from "lucide-react";

const KEY = "dovie-quick-notes";
const MAX = 2000;

function load(): string {
  try {
    return localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

/**
 * A scratch pad for passing thoughts. It saves as you type, on this device only.
 * Only rendered after hydration (TodayGate), so reading storage here is safe.
 */
export function QuickNotes() {
  const [text, setText] = useState(load);
  const [saved, setSaved] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  function change(next: string) {
    setText(next);
    setSaved(false);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      try {
        if (next) localStorage.setItem(KEY, next);
        else localStorage.removeItem(KEY);
      } catch {
        // Storage blocked; the note stays for this visit.
      }
      setSaved(true);
    }, 400);
  }

  return (
    <section
      aria-labelledby="quick-notes-title"
      className="sticky-note tape bg-butter p-4 pt-5 text-butter-foreground -rotate-1 [--tape-tilt:2deg] hover:rotate-0 sm:p-5 sm:pt-6"
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <h2 id="quick-notes-title" className="flex items-center gap-1.5 font-hand text-2xl leading-none">
          <PencilLine className="size-4" aria-hidden /> Quick notes
        </h2>
        <span aria-live="polite" className="text-[0.65rem] opacity-70">
          {saved ? "Saved on this device" : "Saving…"}
        </span>
      </div>
      <textarea
        aria-label="Quick notes"
        placeholder="Jot something down…"
        rows={6}
        maxLength={MAX}
        value={text}
        onChange={(e) => change(e.target.value)}
        className="pad-lines block w-full resize-none bg-transparent font-hand text-xl text-foreground outline-none placeholder:text-butter-foreground/50"
      />
    </section>
  );
}
