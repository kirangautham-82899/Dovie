import Link from "next/link";
import {
  ArrowRight,
  BookHeart,
  CalendarDays,
  Check,
  Droplets,
  HeartPulse,
  LineChart,
  Lock,
  ShieldCheck,
  Sparkles,
  Sun,
  Target,
  Timer,
  Wallet,
} from "lucide-react";
import { DoveMark, Logo } from "@/components/logo";
import { HeroOrbit } from "@/components/hero-orbit";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

const MODULES = [
  { label: "Today", icon: Sun },
  { label: "Goals", icon: Target },
  { label: "Money", icon: Wallet },
  { label: "Journal", icon: BookHeart },
  { label: "Wellness", icon: HeartPulse },
  { label: "Calendar", icon: CalendarDays },
  { label: "Weekly review", icon: LineChart },
];

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
    a: "Yes. Journal entries are encrypted in your browser with AES-256 before they are saved, using a key only your passphrase or recovery key can unlock. Dovie stores only the encrypted text and never uses journal words for insights.",
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
  { icon: Lock, title: "Encrypted journal", body: "AES-256 in your browser. Dovie only ever stores ciphertext." },
  { icon: ShieldCheck, title: "No bank access", body: "Add money by hand. No cards, SMS or statements, ever." },
  { icon: Sparkles, title: "No selling, no ads", body: "Insights use numbers and completions, never your words." },
  { icon: Check, title: "Export or erase", body: "Download everything as JSON, or delete your account in one step." },
];

function Feature({
  icon: Icon,
  accent,
  title,
  body,
  children,
  className = "",
}: {
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  title: string;
  body: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <article className={`group relative border-r border-b p-6 transition-colors hover:bg-secondary/40 ${className}`}>
      <span className={`absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 transition-transform group-hover:scale-x-100 ${accent}`} />
      <Icon className="size-5 text-primary" />
      <h3 className="mt-3 font-serif text-2xl">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
      <div className="mt-5">{children}</div>
    </article>
  );
}

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
        "Private encrypted journal",
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
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[46rem]">
        <div className="animate-float-slow absolute -top-32 -left-24 size-[30rem] rounded-full bg-[hsl(345_90%_88%)] opacity-60 blur-3xl dark:opacity-20" />
        <div className="animate-float absolute top-0 right-[-8rem] size-[28rem] rounded-full bg-[hsl(266_85%_90%)] opacity-60 blur-3xl dark:opacity-20" />
        <div className="animate-float-slow absolute top-[24rem] left-1/3 size-[22rem] rounded-full bg-[hsl(18_95%_88%)] opacity-50 blur-3xl dark:opacity-15" />
      </div>

      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5">
          <Link href="/" aria-label="Dovie home">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-7 text-sm font-medium text-muted-foreground md:flex">
            <a href="#features" className="hover:text-foreground">
              Features
            </a>
            <a href="#how" className="hover:text-foreground">
              How it works
            </a>
            <a href="#privacy" className="hover:text-foreground">
              Privacy
            </a>
            <a href="#faq" className="hover:text-foreground">
              FAQ
            </a>
          </nav>
          <div className="flex items-center gap-1">
            <Link href="/login" className="px-3 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
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
        {/* ---------- hero ---------- */}
        <section className="mx-auto grid w-full max-w-6xl lg:grid-cols-[1.1fr_1fr]">
          <div className="animate-rise px-5 pt-12 pb-10 lg:border-r lg:pt-16 lg:pr-12 lg:pb-14">
            {/* The h1 leads with what Dovie is (for search), then the feeling (for people). */}
            <h1>
              <span className="inline-flex items-center gap-2 border-l-2 border-primary pl-2.5 font-sans text-xs font-semibold tracking-wide text-primary uppercase">
                Daily planner, habit tracker &amp; budget app
              </span>
              <span className="mt-5 block font-serif text-[3.1rem] leading-[0.98] tracking-tight sm:text-7xl lg:text-[5rem]">
                A softer place
                <br />
                to <em className="text-rose pr-2">start again.</em>
              </span>
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
              Dovie is a free daily planner and to-do list, habit tracker, expense tracker and private journal, with
              mood, sleep and focus tracking. One gentle app that cheers you on instead of keeping score.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-4">
              <Link
                href="/signup"
                className="group inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Make a little space
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <a
                href="#features"
                className="border-b-2 border-primary/30 pb-0.5 text-sm font-semibold transition-colors hover:border-primary"
              >
                Take a look around
              </a>
            </div>
            <ul className="mt-10 grid max-w-lg grid-cols-3 divide-x border-y text-xs text-muted-foreground">
              <li className="flex flex-col gap-1 py-3 pr-3">
                <ShieldCheck className="size-4 text-primary" /> No bank connections
              </li>
              <li className="flex flex-col gap-1 px-3 py-3">
                <Lock className="size-4 text-primary" /> Encrypted journal
              </li>
              <li className="flex flex-col gap-1 py-3 pl-3">
                <Sparkles className="size-4 text-primary" /> Free in beta
              </li>
            </ul>
          </div>
          <div className="flex items-center justify-center overflow-x-clip px-5 pt-2 pb-10 lg:py-10">
            <HeroOrbit />
          </div>
        </section>

        {/* ---------- module strip ---------- */}
        <section aria-label="What's inside" className="border-y bg-background/60 backdrop-blur">
          <ul className="mx-auto flex w-full max-w-6xl divide-x overflow-x-auto border-x [scrollbar-width:none]">
            {MODULES.map((m) => (
              <li key={m.label} className="flex min-w-fit flex-1 items-center justify-center gap-2 px-5 py-4 text-sm font-medium">
                <m.icon className="size-4 text-primary" />
                {m.label}
              </li>
            ))}
          </ul>
        </section>

        {/* ---------- features ---------- */}
        <section id="features" className="mx-auto w-full max-w-6xl scroll-mt-16 px-5 pt-14">
          <div className="flex flex-wrap items-end justify-between gap-4 pb-8">
            <div>
              <p className="eyebrow">A companion, not a scorecard</p>
              <h2 className="mt-2 font-serif text-4xl tracking-tight sm:text-5xl">The whole you belongs here.</h2>
            </div>
            <p className="max-w-sm text-sm text-muted-foreground">
              A planner, habit tracker, money manager, journal and wellness app in one soft home. Use one or all of them.
            </p>
          </div>

          <div className="grid border-t border-l md:grid-cols-3">
            <Feature
              icon={Sun}
              accent="bg-chart-1"
              title="A day that fits"
              body="A daily planner and to-do list with your top three priorities, the rest of the list and an evening check-in. Unfinished tasks roll gently into tomorrow."
            >
              <ul className="divide-y border-y text-sm">
                {["Reply to Jae's email", "Pick up groceries", "Stretch for 10 min"].map((t, i) => (
                  <li key={t} className="flex items-center gap-2.5 py-2">
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
              accent="bg-chart-3"
              title="Small habits"
              body="A habit tracker with streaks that bend around real life, plus a goal tracker for the bigger things."
            >
              <div className="flex gap-1.5">
                {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                  <span
                    key={i}
                    className={`flex size-8 items-center justify-center rounded-full border text-xs font-bold ${i < 5 ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                  >
                    {d}
                  </span>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">5-day streak · best 12</p>
            </Feature>

            <Feature
              icon={Wallet}
              accent="bg-chart-2"
              title="Money, gently"
              body="An expense tracker and budget planner in rupees: bills, spending, monthly budgets, savings goals and a month-end spending forecast. No bank login, ever."
            >
              <div className="flex items-center gap-4">
                <span
                  className="size-16 shrink-0 rounded-full"
                  style={{
                    background:
                      "conic-gradient(var(--chart-1) 0 40%, var(--chart-2) 40% 65%, var(--chart-3) 65% 85%, var(--chart-4) 85% 100%)",
                    WebkitMask: "radial-gradient(circle, transparent 50%, black 51%)",
                    mask: "radial-gradient(circle, transparent 50%, black 51%)",
                  }}
                />
                <p className="border-l-2 border-chart-2 pl-3 text-xs">
                  <span className="block font-semibold">Internet · due Friday</span>
                  <span className="text-muted-foreground">₹999, monthly</span>
                </p>
              </div>
            </Feature>

            <Feature
              icon={BookHeart}
              accent="bg-chart-3"
              title="A page just for you"
              body="A private journal app and digital diary with daily prompts, gratitude and a mood tracker, encrypted in your browser before it's saved."
            >
              <p className="truncate border-l-2 border-primary pl-3 font-mono text-[0.68rem] text-muted-foreground">
                AV3x9kQ2_pLm7hT0wRz8YbN4sUe…
              </p>
              <p className="mt-2 flex items-center gap-1.5 text-xs">
                <Lock className="size-3.5 text-primary" /> Only you hold the key
              </p>
            </Feature>

            <Feature
              icon={HeartPulse}
              accent="bg-chart-4"
              title="Rest and care"
              body="A sleep tracker, water intake and energy log in a few taps, plus a kind Pomodoro-style focus timer."
            >
              <div className="flex items-center justify-between border-y py-2.5">
                <span className="flex gap-0.5 text-chart-4">
                  {Array.from({ length: 8 }, (_, i) => (
                    <Droplets key={i} className={`size-4 ${i < 6 ? "" : "opacity-25"}`} />
                  ))}
                </span>
                <span className="flex items-center gap-1 font-serif text-2xl">
                  <Timer className="size-4 text-primary" /> 25:00
                </span>
              </div>
            </Feature>

            <Feature
              icon={LineChart}
              accent="bg-chart-5"
              title="Your week, kindly"
              body="A weekly review of plans done, habit rhythm, rest and focus, with AI predictions for next week."
            >
              <div className="flex h-14 items-end gap-1.5 border-b">
                {[40, 65, 50, 90, 70, 35, 55].map((h, i) => (
                  <span key={i} className="flex-1 rounded-t-sm bg-chart-1/70" style={{ height: `${h}%` }} />
                ))}
              </div>
            </Feature>
          </div>
        </section>

        {/* ---------- how it works ---------- */}
        <section id="how" className="mx-auto w-full max-w-6xl scroll-mt-16 px-5 pt-14">
          <p className="eyebrow">How it works</p>
          <div className="mt-4 grid border-t md:grid-cols-3 md:divide-x">
            {STEPS.map((s, i) => (
              <div key={s.title} className="border-b py-6 md:border-b-0 md:px-6 md:first:pl-0">
                <span className="text-rose font-serif text-5xl leading-none">0{i + 1}</span>
                <h3 className="mt-3 font-serif text-2xl">{s.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ---------- privacy ---------- */}
        <section id="privacy" className="mx-auto mt-14 w-full max-w-6xl scroll-mt-16 border-t px-5 pt-10">
          <div className="grid gap-8 md:grid-cols-[1fr_1.4fr]">
            <div>
              <p className="eyebrow">Privacy is a feature</p>
              <h2 className="mt-2 font-serif text-4xl tracking-tight">Your life stays yours.</h2>
              <p className="mt-3 max-w-sm text-sm text-muted-foreground">
                The most personal parts never leave your hands, and everything else is yours to export or erase at any
                time.
              </p>
            </div>
            <ul className="grid border-t border-l sm:grid-cols-2">
              {PRIVACY.map((p) => (
                <li key={p.title} className="border-r border-b p-5">
                  <p.icon className="size-5 text-primary" />
                  <p className="mt-2 font-semibold">{p.title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{p.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ---------- FAQ ---------- */}
        <section id="faq" aria-labelledby="faq-title" className="mx-auto mt-14 w-full max-w-6xl scroll-mt-16 border-t px-5 pt-10">
          <div className="grid gap-8 md:grid-cols-[1fr_1.6fr]">
            <div>
              <p className="eyebrow">Questions, answered</p>
              <h2 id="faq-title" className="mt-2 font-serif text-4xl tracking-tight">
                A planner, habit tracker and budget app in one.
              </h2>
              <p className="mt-3 max-w-sm text-sm text-muted-foreground">
                Everything you might want to know before you make a little space.
              </p>
            </div>
            <div className="divide-y border-y">
              {FAQ.map(({ q, a }) => (
                <details key={q} className="group py-4 [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-serif text-lg">
                    <h3>{q}</h3>
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full border text-primary transition-transform group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- call to action ---------- */}
        <section className="mt-14 border-y bg-blush">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-6 px-5 py-12 md:flex-row md:items-center">
            <div className="flex items-center gap-4">
              <DoveMark className="size-14 shrink-0" />
              <div>
                <h2 className="font-serif text-3xl tracking-tight sm:text-4xl">You don&apos;t have to have it all figured out.</h2>
                <p className="mt-1 text-sm text-muted-foreground">Start with today. The rest can wait.</p>
              </div>
            </div>
            <Link
              href="/signup"
              className="group inline-flex shrink-0 items-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Find your rhythm <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-6 text-xs text-muted-foreground">
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
