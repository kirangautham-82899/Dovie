"use client";

import { GoalsBoard, MovementLog } from "@/features/goals/goals-board";
import { HabitsManager } from "@/features/habits/habits-manager";
import { FitnessManager } from "@/features/fitness/fitness-manager";
import { TodayGate } from "./today-gate";

export function GoalsView() {
  return (
    <TodayGate>
      {({ today }) => (
        <div className="ruled lg:grid-cols-2">
          <div className="lg:col-span-2">
            <GoalsBoard />
          </div>
          <div className="divide-y">
            <HabitsManager today={today} />
          </div>
          <div className="divide-y">
            <FitnessManager today={today} />
            <MovementLog today={today} />
          </div>
        </div>
      )}
    </TodayGate>
  );
}
