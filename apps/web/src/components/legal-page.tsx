import Link from "next/link";
import { Logo } from "@/components/logo";

export function LegalPage({
  eyebrow,
  title,
  intro,
  sections,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  sections: { heading: string; body: React.ReactNode }[];
}) {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-5 py-5">
        <Link href="/" aria-label="Dovie home">
          <Logo />
        </Link>
        <Link href="/today" className="text-sm font-semibold text-muted-foreground hover:text-foreground">
          Back to Dovie
        </Link>
      </header>
      <main className="mx-auto w-full max-w-3xl px-5 pt-4 pb-14">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-2 font-serif text-4xl tracking-tight sm:text-5xl">{title}</h1>
        <p className="mt-4 border-l-2 border-chart-2 py-1 pl-3 text-sm text-muted-foreground">{intro}</p>
        <div className="mt-6 divide-y">
          {sections.map((s) => (
            <section key={s.heading} className="py-5">
              <h2 className="font-serif text-2xl">{s.heading}</h2>
              <div className="mt-2 space-y-2 text-sm leading-relaxed text-muted-foreground">{s.body}</div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
