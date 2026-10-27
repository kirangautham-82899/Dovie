import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Verify it's you",
  robots: { index: false, follow: false },
};

export default function VerifyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
