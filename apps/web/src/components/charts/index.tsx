"use client";

// Charts load on demand: recharts is the heaviest dependency in the app, so
// keeping it out of the page bundles makes every screen compile and load
// faster. A soft placeholder holds the space until a chart arrives.

import dynamic from "next/dynamic";

function Placeholder() {
  return <div className="size-full animate-pulse rounded-xl bg-muted/50" />;
}

export const CategoryDonut = dynamic(() => import("./category-donut"), { ssr: false, loading: Placeholder });
export const ForecastChart = dynamic(() => import("./forecast-chart"), { ssr: false, loading: Placeholder });
