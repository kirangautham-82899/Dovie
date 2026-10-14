import { LegalPage } from "@/components/legal-page";

export const metadata = {
  title: "Privacy",
  description: "How Dovie handles your data: no bank connections, an encrypted journal, export and deletion at any time.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Dovie beta · draft privacy notice"
      title="Privacy, with care."
      intro="This is a plain-language notice for the Dovie beta. It is a draft and must be reviewed by a qualified lawyer before a public launch."
      sections={[
        {
          heading: "What Dovie stores",
          body: (
            <>
              <p>
                Your account (email, name, timezone and the preferences you choose), and the things you add: plans,
                habits, goals, movement, check-ins, sleep and water, focus sessions, expenses, bills, budgets, savings
                goals and time blocks.
              </p>
              <p>
                Journal entries are encrypted in your browser with a key derived from your passphrase before they are
                saved. Dovie stores only the encrypted text and cannot read it. Mood, date and word count are stored
                without encryption so the weekly review can count journal days.
              </p>
            </>
          ),
        },
        {
          heading: "What Dovie never does",
          body: (
            <p>
              Dovie never connects to your bank, cards, SMS or messages, and never sells your data. Insights in the weekly
              review are simple rules over numbers and completions; journal text is never used.
            </p>
          ),
        },
        {
          heading: "Where your data lives",
          body: (
            <p>
              Data is stored in a Supabase Postgres database protected by row-level security, so each account can only
              reach its own rows. The app is served by Vercel. Both act as processors on Dovie&apos;s behalf.
            </p>
          ),
        },
        {
          heading: "Your choices",
          body: (
            <p>
              From Settings you can download everything Dovie holds about you as a JSON file, clear all your records, or
              delete your account entirely. Deleting your account removes your records and your sign-in.
            </p>
          ),
        },
        {
          heading: "Age",
          body: <p>Dovie is currently for adults, 18 and over.</p>,
        },
        {
          heading: "Your rights in India",
          body: (
            <p>
              Dovie aims to follow India&apos;s Digital Personal Data Protection Act, 2023: you can access, correct and
              erase your data, and withdraw consent by deleting your account. A grievance contact will be published before
              public launch.
            </p>
          ),
        },
      ]}
    />
  );
}
