import Link from "next/link";
import type { Meal } from "@/lib/db/meals";
import { formatKcal, MEAL_TYPE_LABELS, sumNutrients } from "@/lib/nutrition";
import { MEAL_TYPES } from "@/lib/validation/meal";
import { DailySummary } from "./DailySummary";
import { MealCard } from "./MealCard";

type DayViewProps = {
  meals: Meal[];
  goal: number;
  timeZone: string;
  /** Show "+ Add" links per meal type (only for today: new meals default to now). */
  canAdd?: boolean;
};

/** A day's total vs. goal, then its meals grouped by meal type. */
export function DayView({ meals, goal, timeZone, canAdd = false }: DayViewProps) {
  const total = sumNutrients(meals.flatMap((meal) => meal.items));

  return (
    <>
      <DailySummary total={total} goal={goal} />

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
                {canAdd && (
                  <Link
                    href={`/log/manual?type=${type}`}
                    className="text-accent text-sm font-medium"
                    aria-label={`Add ${MEAL_TYPE_LABELS[type].toLowerCase()}`}
                  >
                    + Add
                  </Link>
                )}
              </div>
            </div>
            {mealsOfType.length === 0 ? (
              <p className="border-border text-muted rounded-2xl border border-dashed p-4 text-sm">
                Nothing logged.
              </p>
            ) : (
              mealsOfType.map((meal) => <MealCard key={meal.id} meal={meal} timeZone={timeZone} />)
            )}
          </section>
        );
      })}
    </>
  );
}

export function DayViewSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-6" aria-hidden="true">
      <div className="bg-border/60 h-12 w-40 rounded-lg" />
      <div className="bg-border/60 h-36 rounded-2xl" />
      <div className="bg-border/60 h-24 rounded-2xl" />
      <div className="bg-border/60 h-24 rounded-2xl" />
    </div>
  );
}
