import { GuidePage, guideMetadata } from "@/features/seo/guide-page";

export const metadata = guideMetadata("mood-tracker");

export default function Page() {
  return <GuidePage slug="mood-tracker" />;
}
