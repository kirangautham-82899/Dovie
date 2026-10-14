"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorNote, SectionTitle } from "@/components/page-header";
import { formatPaise } from "@/lib/money";
import { relativeDay } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { useBillsDue } from "./use-money";

export function BillsToday({ today }: { today: string }) {
  const [error, setError] = useState<string | null>(null);
  const { query, markPaid } = useBillsDue(today, setError);
  const bills = query.data ?? [];

  return (
    <Card>
      <SectionTitle
        icon={CalendarClock}
        title="Bills to remember"
        aside={
          <Link href="/money" className="text-xs font-semibold text-primary">
            View money →
          </Link>
        }
      />
      {query.isError && <ErrorNote message={query.error.message} onRetry={() => query.refetch()} />}
      {error && <ErrorNote message={error} />}
      {query.isSuccess && bills.length === 0 && (
        <EmptyState title="Nothing due right now" detail="A little breathing room in the bills department." />
      )}
      {bills.length > 0 && (
        <ul className="divide-y">
          {bills.map((b) => (
            <li key={b.id} className="flex items-center gap-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{b.title}</p>
                <p className={cn("text-xs", b.due_date < today ? "text-destructive" : "text-muted-foreground")}>
                  Due {relativeDay(b.due_date, today)}
                  {b.amount_paise !== null && ` · ${formatPaise(b.amount_paise)}`}
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => markPaid.mutate(b.id)} disabled={markPaid.isPending}>
                Paid
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
