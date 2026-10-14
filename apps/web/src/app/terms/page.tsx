import { LegalPage } from "@/components/legal-page";

export const metadata = {
  title: "Terms",
  description: "The plain-language terms for using Dovie, the daily planner and habit tracker app.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Dovie beta · draft terms"
      title="The gentle ground rules."
      intro="These beta terms are a working draft, not a final legal document. They need review by a qualified lawyer before a public launch."
      sections={[
        {
          heading: "Using Dovie",
          body: (
            <p>
              Dovie is a personal planner for adults (18+). Use it for your own life, keep your sign-in safe, and don&apos;t
              use it to harm anyone or to break the law.
            </p>
          ),
        },
        {
          heading: "Not advice",
          body: (
            <p>
              Dovie helps you track things. It is not medical, mental-health, or financial advice. For those, please talk
              to a qualified professional.
            </p>
          ),
        },
        {
          heading: "Your journal key",
          body: (
            <p>
              Your journal is encrypted with your passphrase. If you lose both your passphrase and your recovery key, your
              entries cannot be recovered by anyone, including Dovie.
            </p>
          ),
        },
        {
          heading: "Beta software",
          body: (
            <p>
              Dovie is in beta. Features may change, and there may be bugs or downtime. Please export your data from
              Settings if you want your own copy.
            </p>
          ),
        },
        {
          heading: "Ending things",
          body: (
            <p>
              You can delete your account at any time from Settings. Dovie may suspend accounts that misuse the service.
            </p>
          ),
        },
      ]}
    />
  );
}
