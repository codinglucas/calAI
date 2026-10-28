import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { DayView, DayViewSkeleton } from "@/components/meals/DayView";
import { formatDay, isDay, todayInZone } from "@/lib/dates";
import { getMealsForDay } from "@/lib/db/meals";
import { getProfile } from "@/lib/db/profile";

export async function generateMetadata({ params }: PageProps<"/history/[day]">): Promise<Metadata> {
  const { day } = await params;
  return { title: isDay(day) ? formatDay(day) : "History" };
}

export default function HistoryDayPage({ params }: PageProps<"/history/[day]">) {
  return (
    <div className="flex flex-col gap-6">
      <Link href="/history" className="text-accent text-sm font-medium">
        ← History
      </Link>
      <Suspense fallback={<DayViewSkeleton />}>
        <PastDay params={params} />
      </Suspense>
    </div>
  );
}

async function PastDay({ params }: Pick<PageProps<"/history/[day]">, "params">) {
  const [{ day }, profile] = await Promise.all([params, getProfile()]);
  if (!isDay(day)) {
    notFound();
  }
  const today = todayInZone(profile.timezone);
  if (day === today) {
    redirect("/today");
  }
  if (day > today) {
    notFound();
  }
  const meals = await getMealsForDay(day, profile.timezone);

  return (
    <>
      <h1 className="text-2xl font-semibold">{formatDay(day)}</h1>
      <DayView meals={meals} goal={profile.dailyCalorieGoal} timeZone={profile.timezone} />
    </>
  );
}
