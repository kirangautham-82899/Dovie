import {
  Activity,
  Bike,
  Dumbbell,
  Flame,
  Flower2,
  Footprints,
  Mountain,
  Music,
  PersonStanding,
  Trophy,
  WavesLadder,
} from "lucide-react";

export type ActivityId =
  | "walk"
  | "run"
  | "cycle"
  | "hike"
  | "strength"
  | "yoga"
  | "hiit"
  | "swim"
  | "sport"
  | "dance"
  | "other";

export type ActivityDef = {
  id: ActivityId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Uses GPS for distance, pace and route. */
  gps: boolean;
  /** Counts steps from the motion sensor. */
  steps: boolean;
  /** Resting-speed MET, used when there is no speed to go on. */
  met: number;
  /** Hue for this activity's live screen and history badge. */
  hue: number;
};

export const ACTIVITIES: ActivityDef[] = [
  { id: "walk", label: "Walk", icon: Footprints, gps: true, steps: true, met: 3.5, hue: 156 },
  { id: "run", label: "Run", icon: PersonStanding, gps: true, steps: true, met: 9, hue: 8 },
  { id: "cycle", label: "Cycle", icon: Bike, gps: true, steps: false, met: 7, hue: 212 },
  { id: "hike", label: "Hike", icon: Mountain, gps: true, steps: true, met: 6, hue: 32 },
  { id: "strength", label: "Strength", icon: Dumbbell, gps: false, steps: false, met: 5, hue: 266 },
  { id: "yoga", label: "Yoga", icon: Flower2, gps: false, steps: false, met: 2.5, hue: 300 },
  { id: "hiit", label: "HIIT", icon: Flame, gps: false, steps: true, met: 8, hue: 352 },
  { id: "swim", label: "Swim", icon: WavesLadder, gps: false, steps: false, met: 7, hue: 196 },
  { id: "sport", label: "Sport", icon: Trophy, gps: true, steps: true, met: 7, hue: 44 },
  { id: "dance", label: "Dance", icon: Music, gps: false, steps: true, met: 5, hue: 330 },
  { id: "other", label: "Other", icon: Activity, gps: false, steps: true, met: 4, hue: 180 },
];

const BY_ID = new Map(ACTIVITIES.map((a) => [a.id, a]));

export function activity(id: string): ActivityDef {
  return BY_ID.get(id as ActivityId) ?? ACTIVITIES[ACTIVITIES.length - 1];
}

/** Pace (min/km) suits feet; speed (km/h) suits wheels. */
export function showsPace(id: ActivityId) {
  return id === "walk" || id === "run" || id === "hike";
}
