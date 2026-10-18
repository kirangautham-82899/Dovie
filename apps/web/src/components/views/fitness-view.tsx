"use client";

import { FitnessScreen } from "@/features/fitness/tracker/fitness-screen";
import { TodayGate } from "./today-gate";

export function FitnessView() {
  return <TodayGate>{({ profile, today }) => <FitnessScreen today={today} profileId={profile.id} />}</TodayGate>;
}
