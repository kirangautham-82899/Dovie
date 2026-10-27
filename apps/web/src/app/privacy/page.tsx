import { LegalPage } from "@/components/legal-page";
import { SUPPORT_EMAIL } from "@/lib/site";

export const metadata = {
  title: "Privacy",
  description: "How Dovie handles your data: no bank connections, a private journal, export and deletion at any time.",
  alternates: { canonical: "/privacy" },
};

const UPDATED = "27 October 2026";

function Contact({ fallback }: { fallback: string }) {
  return SUPPORT_EMAIL ? (
    <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-foreground underline">
      {SUPPORT_EMAIL}
    </a>
  ) : (
    <>{fallback}</>
  );
}

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow={`Dovie beta · draft privacy notice · updated ${UPDATED}`}
      title="Privacy, with care."
      intro="This is a plain-language notice for the Dovie beta. It is a draft and must be reviewed by a qualified lawyer before a public launch."
      sections={[
        {
          heading: "What Dovie stores",
          body: (
            <>
              <p>
                <strong>Your account:</strong> email, name, timezone, the preferences you choose, and how you sign in
                (email and password, or Google).
              </p>
              <p>
                <strong>The things you add:</strong> plans and time blocks, habits, goals and milestones, check-ins
                (mood, energy, sleep, water), focus sessions, journal pages, and money records (income, expenses, bills,
                budgets and savings goals).
              </p>
              <p>
                <strong>Health and location data, only if you use those features:</strong> workouts, including the GPS
                route of outdoor sessions you record, steps, heart rate and body measurements; meals; cycle (period) logs;
                and mind and mood logs. These are sensitive: routes, body measurements, meals, cycle logs and mind
                logs stay on your account and are never sent to AI services.
              </p>
              <p>
                Journal pages are saved as text on your account and can only be read while you are signed in. They are
                not end-to-end encrypted, so the people who run Dovie&apos;s database could technically reach them;
                Dovie does not read, sell or analyse them.
              </p>
            </>
          ),
        },
        {
          heading: "What Dovie never does",
          body: (
            <p>
              Dovie never connects to your bank, cards, SMS or messages, shows no ads, and never sells your data. Journal
              text, task titles and expense notes are never used for insights or sent to AI services.
            </p>
          ),
        },
        {
          heading: "AI insights",
          body: (
            <p>
              &ldquo;Ask Dovie&rdquo; is optional and only runs when you press it. It sends a short summary of numbers
              and labels (for example weekly totals and averages for plans, habits, sleep, mood, focus and movement; weekday
              names; spending category totals; bill names and goal titles)
              to an AI service, Google Gemini or Anthropic Claude, to write a few sentences back. Each panel says exactly
              what it sends before you press the button. The summary is not used to identify you, and you can simply not
              use the feature.
            </p>
          ),
        },
        {
          heading: "Where your data lives",
          body: (
            <>
              <p>
                Data is stored in a Supabase Postgres database. Row-level security means each account can only reach its
                own rows, and two-step verification, when you turn it on, is enforced by the database too. Data is
                encrypted in transit (HTTPS) and at rest.
              </p>
              <p>
                The app is served by Vercel. Supabase, Vercel, Google (for Google sign-in and Gemini) and Anthropic act as
                service providers on Dovie&apos;s behalf; their servers may be outside India.
              </p>
            </>
          ),
        },
        {
          heading: "Cookies and storage on your device",
          body: (
            <p>
              Dovie uses only the cookies it needs to keep you signed in. Your browser also keeps a few conveniences, such
              as your colour theme, calendar layers, cached screens for speed and your weekly reflections, which stay on
              that device. There are no advertising or tracking cookies.
            </p>
          ),
        },
        {
          heading: "Your choices",
          body: (
            <p>
              From Settings you can download everything Dovie holds about you as a JSON file, clear all your records,
              turn on two-step verification, sign out on every device, or delete your account entirely. Deleting your
              account removes your records and your sign-in straight away.
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
              erase your data, and withdraw consent by deleting your account. For questions, requests or grievances,
              contact <Contact fallback="the grievance contact, which will be published before public launch" />.
            </p>
          ),
        },
      ]}
    />
  );
}
