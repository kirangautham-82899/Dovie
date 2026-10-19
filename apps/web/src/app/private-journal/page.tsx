import { GuidePage, guideMetadata } from "@/features/seo/guide-page";

export const metadata = guideMetadata("private-journal");

export default function Page() {
  return <GuidePage slug="private-journal" />;
}
