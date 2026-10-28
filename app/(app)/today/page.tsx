import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { DailySummary } from "@/components/meals/DailySummary";
import { MealCard } from "@/components/meals/MealCard";
import { formatDay, todayInZone } from "@/lib/dates";
import { getMealsForDay } from "@/lib/db/meals";
import { getProfile } from "@/lib/db/profile";
import { formatKcal, MEAL_TYPE_LABELS, sumNutrients } from "@/lib/nutrition";
import { MEAL_TYPES } from "@/lib/validation/meal";

export const metadata: Metadata = { title: "Today" };

export default function TodayPage() {
  return (
    <Suspense fallback={<TodaySkeleton />}>
      <Today />
    </Suspense>
  );
}

async function Today() {
  const profile = await getProfile();
  const today = todayInZone(profile.timezone);
  const meals = await getMealsForDay(today, profile.timezone);
  const total = sumNutrients(meals.flatMap((meal) => meal.items));

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-muted text-sm">{formatDay(today)}</p>
        <h1 className="text-2xl font-semibold">Today</h1>
      </header>

      <DailySummary total={total} goal={profile.dailyCalorieGoal} />

      {MEAL_TYPES.map((type) => {
        const mealsOfType = meals.filter((meal) => meal.mealType === type);
        const typeKcal = sumNutrients(mealsOfType.flatMap((meal) => meal.items)).kcal;
        return (
          <section key={type} className="flex flex-col gap-3" aria-labelledby={`${type}-heading`}>
            <div className="flex items-baseline justify-between">
              <h2 id={`${type}-heading`} className="text-lg font-semibold">
                {MEAL_TYPE_LABELS[type]}
              </h2>
              <div className="flex items-baseline gap-3">
                {typeKcal > 0 && (
                  <span className="text-muted text-sm tabular-nums">
                    {formatKcal(typeKcal)} kcal
                  </span>
                )}
                <Link
                  href={`/log/manual?type=${type}`}
                  className="text-accent text-sm font-medium"
                  aria-label={`Add ${MEAL_TYPE_LABELS[type].toLowerCase()}`}
                >
                  + Add
                </Link>
              </div>
            </div>
            {mealsOfType.length === 0 ? (
              <p className="border-border text-muted rounded-2xl border border-dashed p-4 text-sm">
                Nothing logged yet.
              </p>
            ) : (
              mealsOfType.map((meal) => (
                <MealCard key={meal.id} meal={meal} timeZone={profile.timezone} />
              ))
            )}
          </section>
        );
      })}
    </div>
  );
}

function TodaySkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-6" aria-hidden="true">
      <div className="bg-border/60 h-12 w-40 rounded-lg" />
      <div className="bg-border/60 h-36 rounded-2xl" />
      <div className="bg-border/60 h-24 rounded-2xl" />
      <div className="bg-border/60 h-24 rounded-2xl" />
    </div>
  );
}
