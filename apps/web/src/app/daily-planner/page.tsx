import { GuidePage, guideMetadata } from "@/features/seo/guide-page";

export const metadata = guideMetadata("daily-planner");

export default function Page() {
  return <GuidePage slug="daily-planner" />;
}
