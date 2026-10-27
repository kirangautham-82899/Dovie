import { LegalPage } from "@/components/legal-page";
import { SUPPORT_EMAIL } from "@/lib/site";

export const metadata = {
  title: "Terms",
  description: "The plain-language terms for using Dovie, the daily planner and habit tracker app.",
  alternates: { canonical: "/terms" },
};

const UPDATED = "27 October 2026";

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow={`Dovie beta · draft terms · updated ${UPDATED}`}
      title="The gentle ground rules."
      intro="These beta terms are a working draft, not a final legal document. They need review by a qualified lawyer before a public launch."
      sections={[
        {
          heading: "Using Dovie",
          body: (
            <p>
              Dovie is a personal planner for adults (18+). Use it for your own life, keep your sign-in safe (two-step
              verification in Settings helps), and don&apos;t use it to harm anyone, break the law, or try to reach other
              people&apos;s data or disrupt the service.
            </p>
          ),
        },
        {
          heading: "Not advice",
          body: (
            <p>
              Dovie helps you track things. Forecasts, predictions, savings tips and AI insights are estimates from your
              own entries, not medical, mental-health or financial advice. For those, please talk to a qualified
              professional.
            </p>
          ),
        },
        {
          heading: "Your content",
          body: (
            <p>
              What you add to Dovie, journal pages included, belongs to you. You give Dovie only the permission it needs
              to store it and show it back to you. Journal pages are not end-to-end encrypted. If you delete something or
              your account, it is permanently removed.
            </p>
          ),
        },
        {
          heading: "Beta software",
          body: (
            <p>
              Dovie is in beta and free while it is. Features may change, and there may be bugs or downtime; Dovie is
              provided as is, without guarantees. Please download your data from Settings if you want your own copy.
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
        {
          heading: "Changes and contact",
          body: (
            <p>
              If these terms change in a way that matters, Dovie will say so in the app before the change applies.
              {SUPPORT_EMAIL ? (
                <>
                  {" "}
                  Questions? Write to{" "}
                  <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-foreground underline">
                    {SUPPORT_EMAIL}
                  </a>
                  .
                </>
              ) : null}
            </p>
          ),
        },
      ]}
    />
  );
}
