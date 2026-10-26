import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create your free account",
  description:
    "Join Dovie free: a daily planner, to-do list, habit tracker, expense tracker and private journal in one gentle app.",
  alternates: { canonical: "/signup" },
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
