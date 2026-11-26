// Checks the bill reminder emails. Run from apps/web:  npm run test:bill-email
// (no Supabase or Resend needed)
import { composeReminders } from "../../../supabase/functions/bill-reminders/compose.ts";

let failed = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `  -> ${detail}`}`);
  if (!ok) failed++;
};
const bill = (over) => ({
  bill_id: "b1",
  user_id: "u1",
  email: "a@example.com",
  display_name: "Asha",
  title: "Internet",
  amount_paise: 99900,
  due_date: "2026-11-27",
  ...over,
});

check("no bills, no email", composeReminders([], "https://x.test").length === 0);

const [one] = composeReminders([bill()], "https://x.test/");
check("one bill is addressed to its owner", one.to === "a@example.com" && one.subject === "A bill is due tomorrow", JSON.stringify(one));
check("it names the bill, amount and day", /Internet · ₹999\b/.test(one.text) && /Friday.*27 November/.test(one.text), one.text);
check("it links to Money and the off switch", one.text.includes("https://x.test/money") && one.text.includes("https://x.test/settings"), one.text);
check("bill names stay out of the subject", !one.subject.includes("Internet"));

const many = composeReminders(
  [bill(), bill({ bill_id: "b2", title: "Rent", amount_paise: "1500000" }), bill({ bill_id: "b3", user_id: "u2", email: "b@example.com" })],
  "https://x.test",
);
check("one email per person", many.length === 2 && many[0].billIds.join() === "b1,b2" && many[1].to === "b@example.com", JSON.stringify(many));
check("large amounts use Indian grouping", many[0].text.includes("₹15,000"), many[0].text);

const [odd] = composeReminders([bill({ title: `<img src=x onerror=alert(1)>`, amount_paise: null, display_name: null })], "https://x.test");
check("bill names are escaped in HTML", !odd.html.includes("<img") && odd.html.includes("&lt;img"), odd.html);
check("a missing amount and name read cleanly", odd.text.startsWith("Hi,") && !odd.text.includes("·"), odd.text);

process.exit(failed ? 1 : 0);
