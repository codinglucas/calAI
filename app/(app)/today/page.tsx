import type { Metadata } from "next";
import { Suspense } from "react";
import { DayView, DayViewSkeleton } from "@/components/meals/DayView";
import { formatDay, todayInZone } from "@/lib/dates";
import { getMealsForDay } from "@/lib/db/meals";
import { getProfile } from "@/lib/db/profile";

export const metadata: Metadata = { title: "Today" };

export default function TodayPage() {
  return (
    <Suspense fallback={<DayViewSkeleton />}>
      <Today />
    </Suspense>
  );
}

async function Today() {
  const profile = await getProfile();
  const today = todayInZone(profile.timezone);
  const meals = await getMealsForDay(today, profile.timezone);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-muted text-sm">{formatDay(today)}</p>
        <h1 className="text-2xl font-semibold">Today</h1>
      </header>
      <DayView meals={meals} goal={profile.dailyCalorieGoal} timeZone={profile.timezone} canAdd />
    </div>
  );
}
