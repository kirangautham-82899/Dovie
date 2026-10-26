import Link from "next/link";
import {
  ArrowRight,
  BookHeart,
  BookLock,
  Check,
  Download,
  Droplets,
  EyeOff,
  HandCoins,
  HeartPulse,
  LineChart,
  Lock,
  Sun,
  Target,
  Timer,
  Wallet,
} from "lucide-react";
import { DoveMark, Logo } from "@/components/logo";
import { DoveLetter } from "@/components/dove-letter";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import { GUIDE_SLUGS, GUIDES, type GuideSlug } from "@/features/seo/guides";

const STEPS = [
  { title: "Pick what matters", body: "Choose the parts of life you want more room for. Skip the rest; it stays out of your way." },
  { title: "Begin small", body: "Star your top three, tick a habit, log a glass of water. Everything is one tap." },
  { title: "Look back kindly", body: "A weekly review that notices patterns from your numbers without keeping score." },
];

// Questions people actually search for. Shown on the page and mirrored in
// FAQPage structured data, which must match the visible text.
const FAQ = [
  {
    q: "Is Dovie a free daily planner app?",
    a: "Yes. Dovie is free while in beta. It brings a daily planner and to-do list, habit tracker, expense tracker, budget planner, private journal and wellness tracking together in one app, so you don't need five separate ones.",
  },
  {
    q: "Can I use Dovie as a habit tracker?",
    a: "Yes. Add small daily habits, tick them off in one tap and watch your streaks grow. Streaks are kind: a missed day doesn't wipe your progress, and the weekly review shows your habit rhythm over time.",
  },
  {
    q: "Is Dovie a good expense tracker and budget planner in India?",
    a: "Dovie tracks spending in rupees, with bills and due dates, monthly budgets by category, savings goals and a month-end spending forecast. You add expenses yourself, so Dovie never asks for bank logins, cards or SMS access.",
  },
  {
    q: "Is my journal private?",
    a: "Yes. Your journal pages are saved to your account and can only be read while you are signed in. They are not end-to-end encrypted, and Dovie never uses journal words for insights or ads.",
  },
  {
    q: "Does Dovie predict my spending or my week?",
    a: "Yes. Dovie forecasts your month-end spending, flags budgets that may run over and estimates when you'll reach savings goals. The weekly review predicts next week's plans, habits, sleep and focus from your last four weeks.",
  },
  {
    q: "Does Dovie work on my phone?",
    a: "Yes. Dovie works in any modern browser on Android, iPhone and desktop, and you can add it to your home screen to open it like an app.",
  },
];

const PRIVACY = [
  { icon: BookLock, title: "A private journal", body: "Only you can read it when signed in. Never used for insights." },
  { icon: HandCoins, title: "No bank access", body: "Add money by hand. No cards, SMS or statements, ever." },
  { icon: EyeOff, title: "No selling, no ads", body: "Insights use numbers and completions, never your words." },
  { icon: Download, title: "Export or erase", body: "Download everything as JSON, or delete your account in one step." },
];

const NAV = [
  { href: "#features", label: "Features" },
  { href: "#how", label: "How it works" },
  { href: "#privacy", label: "Privacy" },
  { href: "#faq", label: "FAQ" },
];

/** Centered heading used by every section, so the page keeps one rhythm. */
function SectionHead({
  eyebrow,
  title,
  id,
  children,
}: {
  eyebrow: string;
  title: string;
  id?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="eyebrow">{eyebrow}</p>
      <h2 id={id} className="mt-2 font-serif text-2xl tracking-tight text-balance sm:text-3xl">
        {title}
      </h2>
      {children && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{children}</p>}
    </div>
  );
}

const CTA_PRIMARY =
  "group inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-primary/90";

/** A soft tinted card for the feature grid. */
function Feature({
  icon: Icon,
  tint,
  title,
  body,
  className = "",
  guide,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tint: string;
  title: string;
  body: string;
  className?: string;
  /** The public guide page for this feature, linked with its keyword. */
  guide?: GuideSlug;
  children: React.ReactNode;
}) {
  return (
    <article className={`group flex flex-col rounded-[1.75rem] p-5 ${tint} ${className}`}>
      <div>
        <span className="flex size-10 items-center justify-center rounded-2xl bg-card/80 text-primary">
          <Icon className="size-5" />
        </span>
        <h3 className="mt-4 font-serif text-2xl">{title}</h3>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-foreground/70">{body}</p>
        {guide && (
          <Link href={`/${guide}`} className="mt-2 inline-block text-sm font-semibold text-primary underline-offset-4 hover:underline">
            {GUIDES[guide].name} →
          </Link>
        )}
      </div>
      <div className="mt-auto pt-4 md:group-[.wide]:mt-0 md:group-[.wide]:pt-0">{children}</div>
    </article>
  );
}

/** White inset panel that holds each feature's little preview. */
const PANEL = "rounded-2xl bg-card/75 p-4";

function StructuredData() {
  const data = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: SITE_NAME,
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      applicationCategory: "LifestyleApplication",
      applicationSubCategory: "Productivity",
      operatingSystem: "Web, Android, iOS",
      offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
      featureList: [
        "Daily planner and to-do list",
        "Habit tracker with streaks",
        "Expense tracker and budget planner",
        "Month-end spending forecast",
        "Private journal",
        "Mood, sleep and water tracker",
        "Focus timer",
        "Weekly review with predictions",
      ],
    },
    { "@context": "https://schema.org", "@type": "Organization", name: SITE_NAME, url: SITE_URL, logo: `${SITE_URL}/icon.svg` },
    { "@context": "https://schema.org", "@type": "WebSite", name: SITE_NAME, url: SITE_URL, inLanguage: "en-IN" },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQ.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
    },
  ];
  return (
    <script
      type="application/ld+json"
      // Escape "<" so the JSON can never close the script tag early.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

export default function LandingPage() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-x-clip">
      <StructuredData />
      {/* Soft colour wash behind the hero. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[44rem]">
        <div className="animate-float-slow absolute -top-28 -left-24 size-[28rem] rounded-full bg-wash-1 opacity-40 blur-3xl dark:opacity-20" />
        <div className="animate-float absolute top-8 -right-32 size-[26rem] rounded-full bg-wash-2 opacity-40 blur-3xl dark:opacity-20" />
      </div>

      {/* Floating header */}
      <header className="sticky top-2 z-30 px-3">
        <div className="mx-auto flex h-12 w-full max-w-5xl items-center justify-between rounded-full border bg-card/75 pr-2 pl-5 shadow-soft backdrop-blur-md">
          <Link href="/" aria-label="Dovie home">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-1 text-sm font-medium text-muted-foreground md:flex">
            {NAV.map((n) => (
              <a
                key={n.href}
                href={n.href}
                className="rounded-full px-3.5 py-2 transition-colors hover:bg-secondary hover:text-secondary-foreground"
              >
                {n.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-1">
            <Link
              href="/login"
              className="px-3 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Join Dovie
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* ---------- hero: a small letter, carried by Dovie ---------- */}
        <section className="mx-auto w-full max-w-md px-5 pt-1 pb-6">
          <div className="animate-rise">
            <DoveLetter>
              <p className="font-serif text-base text-muted-foreground italic">Dear you,</p>

              {/* The h1 leads with what Dovie is (for search), then the feeling (for people). */}
              <h1 className="mt-1">
                <span className="sr-only">Daily planner, habit tracker and budget app. </span>
                <span className="block font-serif text-3xl leading-[1.08] tracking-tight text-balance sm:text-4xl">
                  A softer place to <em className="text-rose pr-1">start again.</em>
                </span>
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Plan your day, tick off a habit, jot down a thought. One quiet place for all of it.
              </p>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                <Link href="/signup" className={CTA_PRIMARY}>
                  Make a little space
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <p className="font-serif text-base text-muted-foreground italic">with care, Dovie</p>
              </div>
            </DoveLetter>
          </div>
        </section>

        {/* ---------- features ---------- */}
        <section id="features" aria-labelledby="features-title" className="mx-auto w-full max-w-6xl scroll-mt-24 px-5 pb-6 sm:pb-8">
          <h2 id="features-title" className="sr-only">
            Everything in one gentle app
          </h2>
          <div className="grid gap-4 md:grid-cols-6">
            <Feature
              icon={Sun}
              tint="bg-secondary"
              className="md:col-span-4"
              title="A day that fits"
              guide="daily-planner"
              body="A daily planner and to-do list with your top three, the rest of the list and an evening check-in. Unfinished tasks roll gently into tomorrow."
            >
              <ul className={`${PANEL} space-y-2.5 text-sm`}>
                {["Reply to Jae's email", "Pick up groceries", "Stretch for 10 min"].map((t, i) => (
                  <li key={t} className="flex items-center gap-3">
                    <span
                      className={`flex size-4 items-center justify-center rounded-full border-2 ${i < 2 ? "border-primary bg-primary text-primary-foreground" : "border-primary/40"}`}
                    >
                      {i < 2 && <Check className="size-2.5" />}
                    </span>
                    <span className={i < 2 ? "text-muted-foreground line-through" : ""}>{t}</span>
                  </li>
                ))}
              </ul>
            </Feature>

            <Feature
              icon={Target}
              tint="bg-lilac"
              className="md:col-span-2"
              title="Small habits"
              guide="habit-tracker"
              body="Streaks that bend around real life, plus a goal tracker for the bigger things."
            >
              <div className={PANEL}>
                <div className="flex justify-between">
                  {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                    <span
                      key={i}
                      className={`flex size-7 items-center justify-center rounded-full text-[0.68rem] font-bold ${i < 5 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                    >
                      {d}
                    </span>
                  ))}
                </div>
                <p className="mt-3 text-xs text-muted-foreground">5-day streak · best 12</p>
              </div>
            </Feature>

            <Feature
              icon={Wallet}
              tint="bg-butter"
              className="md:col-span-2"
              title="Money, gently"
              guide="expense-tracker"
              body="Bills, budgets, savings goals and a month-end forecast, in rupees. No bank login, ever."
            >
              <div className={`${PANEL} flex items-center gap-4`}>
                <span
                  className="size-14 shrink-0 rounded-full"
                  style={{
                    background:
                      "conic-gradient(var(--chart-1) 0 40%, var(--chart-2) 40% 65%, var(--chart-3) 65% 85%, var(--chart-4) 85% 100%)",
                    WebkitMask: "radial-gradient(circle, transparent 50%, black 51%)",
                    mask: "radial-gradient(circle, transparent 50%, black 51%)",
                  }}
                />
                <p className="text-xs">
                  <span className="block font-semibold">Internet · due Friday</span>
                  <span className="text-muted-foreground">₹999, monthly</span>
                </p>
              </div>
            </Feature>

            <Feature
              icon={BookHeart}
              tint="bg-sky"
              className="md:col-span-2"
              title="A page just for you"
              guide="private-journal"
              body="A private, dot-grid journal with daily prompts and a gratitude line."
            >
              <div className={PANEL}>
                <p className="truncate font-serif text-sm text-muted-foreground italic">Slow morning. Good tea. Felt calm…</p>
                <p className="mt-2.5 flex items-center gap-1.5 text-xs">
                  <Lock className="size-3.5 text-primary" /> Only you can read it
                </p>
              </div>
            </Feature>

            <Feature
              icon={HeartPulse}
              tint="bg-mint"
              className="md:col-span-2"
              title="Rest and care"
              guide="mood-tracker"
              body="Sleep, water and energy in a few taps, plus a kind focus timer."
            >
              <div className={`${PANEL} flex items-center justify-between`}>
                <span className="flex gap-0.5 text-chart-4">
                  {Array.from({ length: 6 }, (_, i) => (
                    <Droplets key={i} className={`size-4 ${i < 4 ? "" : "opacity-25"}`} />
                  ))}
                </span>
                <span className="flex items-center gap-1 font-serif text-xl">
                  <Timer className="size-4 text-primary" /> 25:00
                </span>
              </div>
            </Feature>

            <Feature
              icon={LineChart}
              tint="bg-accent"
              className="wide md:col-span-6 md:flex-row md:items-center md:justify-between md:gap-10"
              title="Your week, kindly"
              body="A weekly review of plans done, habit rhythm, rest and focus, with predictions for the week ahead. It notices patterns without keeping score."
            >
              <div className={`${PANEL} flex h-24 w-full items-end gap-2 md:w-80`}>
                {[40, 65, 50, 90, 70, 35, 55].map((h, i) => (
                  <span key={i} className="flex-1 rounded-t-md bg-primary/50" style={{ height: `${h}%` }} />
                ))}
              </div>
            </Feature>
          </div>
        </section>

        {/* ---------- how it works ---------- */}
        <section id="how" className="mx-auto w-full max-w-5xl scroll-mt-24 px-5 pb-6 sm:pb-8">
          <SectionHead eyebrow="How it works" title="Three small steps." />
          <ol className="mt-4 grid gap-4 md:grid-cols-3 md:gap-8">
            {STEPS.map((s, i) => (
              <li key={s.title} className="text-center">
                <span className="mx-auto flex size-10 items-center justify-center rounded-full bg-secondary font-serif text-lg text-secondary-foreground">
                  {i + 1}
                </span>
                <h3 className="mt-3 font-serif text-xl">{s.title}</h3>
                <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ---------- privacy ---------- */}
        <section id="privacy" className="mx-auto w-full max-w-6xl scroll-mt-24 px-5 pb-6 sm:pb-8">
          <div className="rounded-[2rem] bg-card/80 p-6 shadow-soft sm:p-8">
            <SectionHead eyebrow="Privacy is a feature" title="Your life stays yours.">
              The most personal parts never leave your hands, and everything else is yours to export or erase at any
              time.
            </SectionHead>
            <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {PRIVACY.map((p) => (
                <li key={p.title} className="text-center">
                  <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-secondary text-primary">
                    <p.icon className="size-5" />
                  </span>
                  <p className="mt-3 font-semibold">{p.title}</p>
                  <p className="mx-auto mt-1 max-w-[16rem] text-sm leading-relaxed text-muted-foreground">{p.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ---------- FAQ ---------- */}
        <section
          id="faq"
          aria-labelledby="faq-title"
          className="mx-auto w-full max-w-3xl scroll-mt-24 px-5 pb-6 sm:pb-8"
        >
          <SectionHead
            eyebrow="Questions, answered"
            title="A planner, habit tracker and budget app in one."
            id="faq-title"
          />
          <div className="mt-6 space-y-2">
            {FAQ.map(({ q, a }) => (
              <details
                key={q}
                className="group rounded-2xl bg-card/80 px-5 py-4 shadow-soft [&_summary::-webkit-details-marker]:hidden"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-serif text-lg">
                  <h3>{q}</h3>
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* ---------- call to action ---------- */}
        <section className="mx-auto w-full max-w-6xl px-5 pb-8">
          <div className="bg-blush flex flex-col items-center rounded-[2rem] px-6 py-8 text-center sm:py-10">
            <DoveMark className="size-12" />
            <h2 className="mt-4 max-w-xl font-serif text-2xl tracking-tight text-balance sm:text-3xl">
              You don&apos;t have to have it all figured out.
            </h2>
            <p className="mt-2 text-muted-foreground">Start with today. The rest can wait.</p>
            <Link href="/signup" className={`${CTA_PRIMARY} mt-5`}>
              Find your rhythm <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </section>
      </main>

      <nav aria-label="Explore Dovie" className="mx-auto w-full max-w-6xl px-5 pb-2">
        <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-muted-foreground">
          {GUIDE_SLUGS.map((slug) => (
            <li key={slug}>
              <Link href={`/${slug}`} className="hover:text-foreground">
                {GUIDES[slug].name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <footer className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-5 pt-2 pb-6 text-xs text-muted-foreground">
        <span>© Dovie. The gentle daily planner, habit tracker and budget app. Made for real life.</span>
        <span className="flex gap-5">
          <Link href="/privacy" className="hover:text-foreground">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-foreground">
            Terms
          </Link>
          <Link href="/login" className="hover:text-foreground">
            Sign in
          </Link>
        </span>
      </footer>

    </div>
  );
}
