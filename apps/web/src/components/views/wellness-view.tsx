"use client";

import { WellnessScreen } from "@/features/wellness/wellness-screen";
import { TodayGate } from "./today-gate";

export function WellnessView() {
  return <TodayGate>{({ today }) => <WellnessScreen today={today} />}</TodayGate>;
}
