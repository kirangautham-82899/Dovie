"use client";

import { PlannerScreen } from "@/features/planner/planner-screen";
import { TodayGate } from "./today-gate";

export function PlannerView() {
  return <TodayGate>{({ today }) => <PlannerScreen today={today} />}</TodayGate>;
}
