import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { DoveMark, Logo } from "@/components/logo";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { GUIDE_SLUGS, GUIDES, type Guide, type GuideSlug } from "./guides";

const CTA =
  "group inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-primary/90";

/** Page metadata: its own title, description, canonical and share card. */
export function guideMetadata(slug: GuideSlug): Metadata {
  const g = GUIDES[slug];
  const path = `/${slug}`;
  return {
    // `absolute` skips the "· Dovie" template; the brand is already in the title.
    title: { absolute: g.title },
    description: g.description,
    keywords: g.keywords,
    alternates: { canonical: path },
    openGraph: { type: "website", siteName: SITE_NAME, locale: "en_IN", url: path, title: g.title, description: g.description },
    twitter: { card: "summary_large_image", title: g.title, description: g.description },
  };
}

function StructuredData({ g }: { g: Guide }) {
  const url = `${SITE_URL}/${g.slug}`;
  const data = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: g.title,
      description: g.description,
      url,
      inLanguage: "en-IN",
      isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: `${SITE_NAME} ${g.name}`,
      url,
      description: g.description,
      applicationCategory: "LifestyleApplication",
      operatingSystem: "Web, Android, iOS",
      offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
      featureList: g.featureList,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL },
        { "@type": "ListItem", position: 2, name: g.name, item: url },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: g.faq.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
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

/** Links to every guide, used in the header strip and the footer. */
function GuideLinks({ current, className }: { current?: GuideSlug; className?: string }) {
  return (
    <ul className={className}>
      {GUIDE_SLUGS.map((s) => (
        <li key={s}>
          <Link
            href={`/${s}`}
            aria-current={s === current ? "page" : undefined}
            className="rounded-full px-3 py-1.5 transition-colors hover:bg-secondary hover:text-secondary-foreground aria-[current=page]:bg-secondary aria-[current=page]:text-secondary-foreground"
          >
            {GUIDES[s].name}
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** A public page that explains one part of Dovie for people searching for it. */
export function GuidePage({ slug }: { slug: GuideSlug }) {
  const g = GUIDES[slug];
  const related = g.related ?? GUIDE_SLUGS.filter((s) => s !== slug).slice(0, 4);

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-clip">
      <StructuredData g={g} />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[36rem]">
        <div className="animate-float-slow absolute -top-28 -left-24 size-[26rem] rounded-full bg-wash-1 opacity-40 blur-3xl dark:opacity-20" />
        <div className="animate-float absolute top-8 -right-32 size-[24rem] rounded-full bg-wash-2 opacity-40 blur-3xl dark:opacity-20" />
      </div>

      <header className="sticky top-2 z-30 px-3">
        <div className="mx-auto flex h-12 w-full max-w-5xl items-center justify-between rounded-full border bg-card/75 pr-2 pl-5 shadow-soft backdrop-blur-md">
          <Link href="/" aria-label="Dovie home">
            <Logo />
          </Link>
          <div className="flex items-center gap-1">
            <Link href="/login" className="px-3 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
              Sign in
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Join free
            </Link>
          </div>
        </div>
      </header>

      <nav aria-label="Dovie features" className="mx-auto mt-3 w-full max-w-5xl overflow-x-auto px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <GuideLinks current={slug} className="flex w-max gap-1 text-sm font-medium text-muted-foreground" />
      </nav>

      <main className="flex-1">
        {/* ---------- hero ---------- */}
        <section className="mx-auto w-full max-w-3xl px-5 pt-6 pb-8 sm:pt-10">
          <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground">
            <Link href="/" className="hover:text-foreground">
              Dovie
            </Link>{" "}
            / <span className="text-foreground">{g.name}</span>
          </nav>
          <p className="eyebrow mt-4">{g.eyebrow}</p>
          <h1 className="mt-2 font-serif text-4xl leading-[1.05] tracking-tight text-balance sm:text-5xl">
            {g.h1} <em className="text-rose pr-1">{g.accent}</em>
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">{g.intro}</p>
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
            <Link href="/signup" className={CTA}>
              Start free
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <span className="text-xs text-muted-foreground">Free while in beta · No card needed</span>
          </div>
          <ul className={`mt-8 grid gap-2 rounded-[1.75rem] p-5 sm:grid-cols-2 ${g.tint}`}>
            {g.highlights.map((h) => (
              <li key={h} className="flex items-center gap-2.5 text-sm font-medium">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-card/80 text-primary">
                  <Check className="size-3.5" />
                </span>
                {h}
              </li>
            ))}
          </ul>
        </section>

        {/* ---------- body ---------- */}
        <article className="mx-auto w-full max-w-3xl divide-y px-5">
          {g.sections.map((s) => (
            <section key={s.heading} className="py-6">
              <h2 className="font-serif text-2xl tracking-tight sm:text-3xl">{s.heading}</h2>
              <div className="mt-3 space-y-3 text-[0.95rem] leading-relaxed text-muted-foreground">
                {s.body.map((p) => (
                  <p key={p.slice(0, 40)}>{p}</p>
                ))}
              </div>
            </section>
          ))}
        </article>

        {/* ---------- how to ---------- */}
        <section aria-labelledby="how-title" className="mx-auto w-full max-w-3xl px-5 py-8">
          <h2 id="how-title" className="font-serif text-2xl tracking-tight sm:text-3xl">
            How to get started
          </h2>
          <ol className="mt-5 grid gap-4 sm:grid-cols-3">
            {g.steps.map((s, i) => (
              <li key={s.title} className="rounded-2xl bg-card/80 p-4 shadow-soft">
                <span className="flex size-8 items-center justify-center rounded-full bg-secondary font-serif text-secondary-foreground">
                  {i + 1}
                </span>
                <h3 className="mt-3 font-serif text-lg">{s.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ---------- FAQ ---------- */}
        <section aria-labelledby="faq-title" className="mx-auto w-full max-w-3xl px-5 pb-8">
          <h2 id="faq-title" className="font-serif text-2xl tracking-tight sm:text-3xl">
            {g.name}: questions, answered
          </h2>
          <div className="mt-5 space-y-2">
            {g.faq.map(({ q, a }) => (
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

        {/* ---------- more of Dovie ---------- */}
        <section aria-labelledby="more-title" className="mx-auto w-full max-w-3xl px-5 pb-8">
          <h2 id="more-title" className="font-serif text-2xl tracking-tight">
            Also in Dovie
          </h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {related.map((s) => (
              <li key={s}>
                <Link
                  href={`/${s}`}
                  className={`group flex h-full flex-col rounded-2xl p-4 transition-transform hover:-translate-y-0.5 ${GUIDES[s].tint}`}
                >
                  <span className="font-serif text-lg">{GUIDES[s].name}</span>
                  <span className="mt-1 text-sm text-foreground/70">{GUIDES[s].description}</span>
                  <span className="mt-2 text-sm font-semibold text-primary">
                    Learn more <ArrowRight className="inline size-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="mx-auto w-full max-w-5xl px-5 pb-8">
          <div className="bg-blush flex flex-col items-center rounded-[2rem] px-6 py-8 text-center sm:py-10">
            <DoveMark className="size-12" />
            <h2 className="mt-4 max-w-xl font-serif text-2xl tracking-tight text-balance sm:text-3xl">
              Try the {g.name.toLowerCase()} in Dovie, free.
            </h2>
            <p className="mt-2 text-muted-foreground">Planner, habits, money, mood and journal in one gentle app.</p>
            <Link href="/signup" className={`${CTA} mt-5`}>
              Make a little space <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="mx-auto w-full max-w-5xl space-y-3 px-5 pt-2 pb-6 text-xs text-muted-foreground">
        <GuideLinks className="-mx-3 flex flex-wrap gap-1" />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span>© Dovie. The gentle daily planner, habit tracker and budget app.</span>
          <span className="flex gap-5">
            <Link href="/" className="hover:text-foreground">
              Home
            </Link>
            <Link href="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-foreground">
              Terms
            </Link>
          </span>
        </div>
      </footer>
    </div>
  );
}
