// Turns due bills into one email per person. Plain TypeScript with no Deno or
// npm imports, so apps/web/scripts/bill-email-test.mjs can run it offline.

export type DueBill = {
  bill_id: string;
  user_id: string;
  email: string;
  display_name: string | null;
  title: string;
  amount_paise: number | string | null;
  due_date: string;
};

export type ReminderEmail = {
  to: string;
  subject: string;
  text: string;
  html: string;
  billIds: string[];
  dueDate: string;
};

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function rupees(paise: number | string | null): string {
  if (paise === null) return "";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2, minimumFractionDigits: 0 }).format(
    Number(paise) / 100,
  );
}

const prettyDate = (date: string) =>
  new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));

/** One email per person and due date; people in different timezones can have different "tomorrows". */
export function composeReminders(bills: DueBill[], siteUrl: string): ReminderEmail[] {
  const groups = new Map<string, DueBill[]>();
  for (const bill of bills) {
    const key = `${bill.user_id} ${bill.due_date}`;
    groups.set(key, [...(groups.get(key) ?? []), bill]);
  }
  const base = siteUrl.replace(/\/+$/, "");

  return [...groups.values()].map((group) => {
    const { email, display_name, due_date } = group[0];
    const name = display_name?.trim();
    const hello = name ? `Hi ${name},` : "Hi,";
    const intro = `${group.length === 1 ? "A bill is" : `${group.length} bills are`} due tomorrow, ${prettyDate(due_date)}:`;
    const lines = group.map((b) => [b.title, rupees(b.amount_paise)].filter(Boolean).join(" · "));
    const off = `You're getting this because email bill reminders are on. Turn them off in Dovie's Settings: ${base}/settings`;

    return {
      to: email,
      // Bill names stay out of the subject, which shows on lock screens.
      subject: group.length === 1 ? "A bill is due tomorrow" : `${group.length} bills are due tomorrow`,
      text: `${hello}\n\n${intro}\n\n${lines.map((l) => `- ${l}`).join("\n")}\n\nOpen Money: ${base}/money\n\n${off}\n`,
      html: `<p>${escapeHtml(hello)}</p><p>${escapeHtml(intro)}</p><ul>${lines
        .map((l) => `<li>${escapeHtml(l)}</li>`)
        .join("")}</ul><p><a href="${escapeHtml(base)}/money">Open Money in Dovie</a></p><p style="font-size:12px;color:#6f6779">${escapeHtml(off)}</p>`,
      billIds: group.map((b) => b.bill_id),
      dueDate: due_date,
    };
  });
}
