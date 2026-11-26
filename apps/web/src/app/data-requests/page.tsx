import Link from "next/link";
import { Contact, LegalPage } from "@/components/legal-page";

export const metadata = {
  title: "Data requests and breaches",
  description: "How to ask for your data or raise a concern with Dovie, how long an answer takes, and what happens after a data breach.",
  alternates: { canonical: "/data-requests" },
};

const UPDATED = "26 November 2026";

const contact = <Contact fallback="the grievance contact, which will be published before public launch" />;

export default function DataRequestsPage() {
  return (
    <LegalPage
      eyebrow={`Dovie beta · draft process · updated ${UPDATED}`}
      title="Requests and breaches."
      intro="This is a working draft for the Dovie beta. It must be reviewed by a qualified lawyer, with its time limits, before a public launch."
      sections={[
        {
          heading: "What you can do yourself",
          body: (
            <p>
              In <Link href="/settings" className="font-semibold text-foreground underline">Settings</Link> you can download your
              data, correct your profile, clear your records or delete your account, straight away. Most things you add can be
              edited or removed on the screen where you added them.
            </p>
          ),
        },
        {
          heading: "Asking Dovie",
          body: (
            <>
              <p>
                For anything else (access, correction, erasure, withdrawing consent, naming someone to act for you, or a
                complaint) write to {contact}. Write from the email you sign in with, and say what you need. Never send your
                password or a verification code.
              </p>
              <p>
                Dovie&apos;s operator reads these requests. If you write from a different address, you may be asked to confirm
                the account is yours before anything is shared or changed.
              </p>
            </>
          ),
        },
        {
          heading: "How long it takes",
          body: (
            <ul className="list-disc space-y-1 pl-5">
              <li>An acknowledgement within 3 working days.</li>
              <li>An answer within 30 days. If something needs longer, you are told why and when to expect it.</li>
            </ul>
          ),
        },
        {
          heading: "If you are not satisfied",
          body: (
            <p>
              Reply to say so and it will be looked at again. Under India&apos;s Digital Personal Data Protection Act, 2023,
              you may complain to the Data Protection Board of India after using this process, as the Act&apos;s provisions
              come into force.
            </p>
          ),
        },
        {
          heading: "If there is a data breach",
          body: (
            <>
              <p>
                If Dovie learns that personal data may have been seen, changed, lost or shared without permission, the
                operator&apos;s first job is to stop it. Then:
              </p>
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  People who are affected are told without delay, by email: what happened, what data was involved, what has
                  been done and what they can do.
                </li>
                <li>
                  The Data Protection Board of India, CERT-In and any other authority are told as the law requires and within
                  its time limits.
                </li>
              </ul>
              <p>Think you have found a security problem? Write to {contact}.</p>
            </>
          ),
        },
      ]}
    />
  );
}
