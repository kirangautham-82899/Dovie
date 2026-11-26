"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { Download, ShieldCheck, Smartphone, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/modal";
import { ErrorNote, SectionTitle } from "@/components/page-header";
import { Slip } from "@/components/notebook";
import { clearAppCache } from "@/lib/app-cache";
import { clearMyData, deleteMyAccount, exportMyData } from "./api";

export function DataSection() {
  const exporter = useMutation({
    mutationFn: exportMyData,
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dovie-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    },
  });

  return (
    <Slip className="p-4 sm:p-5">
      <div id="data" className="scroll-mt-6" />
      <SectionTitle icon={Download} title="Privacy & your data" />
      <ul className="grid gap-2 text-sm sm:grid-cols-2">
        {[
          "Never connects to your bank, cards, texts or messages",
          "Every row is locked to your account in the database",
          "Insights use numbers only, never journal words",
          "No ads, and your data is never sold",
        ].map((t) => (
          <li key={t} className="flex gap-2">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-mint-foreground" /> {t}
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap items-center gap-3 border-t pt-4">
        <Button variant="outline" onClick={() => exporter.mutate()} loading={exporter.isPending}>
          {!exporter.isPending && <Download />} {exporter.isPending ? "Preparing…" : "Download my data"}
        </Button>
        <Link href="/privacy" className="text-xs underline">
          Privacy notice
        </Link>
        <Link href="/terms" className="text-xs underline">
          Terms
        </Link>
      </div>
      {exporter.isError && <div className="mt-3"><ErrorNote message={exporter.error.message} /></div>}
      <p className="mt-4 flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
        <Smartphone className="mt-0.5 size-3.5 shrink-0" />
        Keep Dovie close: use your browser&apos;s menu to install it or add it to your home screen. It opens like an app.
      </p>
    </Slip>
  );
}

export function DangerSection() {
  const [confirmText, setConfirmText] = useState("");
  const [confirming, setConfirming] = useState(false);
  const clear = useMutation({
    mutationFn: clearMyData,
    // A full page load drops every cached screen, so onboarding starts fresh.
    onSuccess: () => {
      clearAppCache();
      window.location.replace("/onboarding");
    },
  });
  const remove = useMutation({
    mutationFn: deleteMyAccount,
    // A full page load, so nothing on screen refetches for an account that is gone.
    onSuccess: () => {
      clearAppCache();
      window.location.replace("/");
    },
  });

  return (
    <Slip className="border-destructive/30 p-4 sm:p-5">
      <div id="danger" className="scroll-mt-6" />
      <SectionTitle icon={Trash2} title="Clear or delete" />
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <p className="text-sm font-semibold">Clear your Dovie data</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Removes every task, habit, goal, check-in, money record and journal page. Your sign-in stays. This can&apos;t
            be undone, so download your data first if you&apos;d like a copy.
          </p>
          <form
            className="mt-3 flex flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (confirmText === "DELETE") clear.mutate();
            }}
          >
            <Input
              aria-label="Type DELETE to confirm"
              placeholder="Type DELETE"
              className="max-w-40"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
            />
            <Button type="submit" variant="destructive" loading={clear.isPending} disabled={confirmText !== "DELETE"}>
              Clear everything
            </Button>
          </form>
          {clear.isError && <div className="mt-3"><ErrorNote message={clear.error.message} /></div>}
        </div>
        <div className="md:border-l md:pl-5">
          <p className="text-sm font-semibold">Delete your account</p>
          <p className="mt-1 text-xs text-muted-foreground">Deletes your account and everything in it, for good.</p>
          <Button variant="destructive" className="mt-3" onClick={() => setConfirming(true)}>
            Delete my account
          </Button>
        </div>
      </div>

      <Modal open={confirming} title="Delete your Dovie account?" onClose={() => setConfirming(false)}>
        <p className="text-sm text-muted-foreground">
          This permanently deletes your account and every Dovie record in it, including your journal. You can download
          your data first from Privacy &amp; your data.
        </p>
        {remove.isError && <div className="mt-3"><ErrorNote message={remove.error.message} /></div>}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={() => setConfirming(false)}>
            Keep my account
          </Button>
          <Button className="bg-destructive text-white hover:bg-destructive/90" onClick={() => remove.mutate()} loading={remove.isPending}>
            Delete account and data
          </Button>
        </div>
      </Modal>
    </Slip>
  );
}
