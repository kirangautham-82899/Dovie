import { GuidePage, guideMetadata } from "@/features/seo/guide-page";

export const metadata = guideMetadata("expense-tracker");

export default function Page() {
  return <GuidePage slug="expense-tracker" />;
}
