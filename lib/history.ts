import { dayInZone } from "@/lib/dates";
import type { Meal } from "@/lib/db/meals";
import { type Nutrients, sumNutrients } from "@/lib/nutrition";

export type DayTotal = {
  day: string;
  total: Nutrients;
  mealCount: number;
};

/**
 * Totals per day for `days`, in the order given. Days with no meals get zero
 * totals, so the result always has one entry per requested day.
 */
export function dailyTotals(meals: Meal[], days: string[], timeZone: string): DayTotal[] {
  const mealsByDay = new Map<string, Meal[]>(days.map((day) => [day, []]));
  for (const meal of meals) {
    mealsByDay.get(dayInZone(meal.eatenAt, timeZone))?.push(meal);
  }
  return days.map((day) => {
    const dayMeals = mealsByDay.get(day) ?? [];
    return {
      day,
      total: sumNutrients(dayMeals.flatMap((meal) => meal.items)),
      mealCount: dayMeals.length,
    };
  });
}

export type HistorySummary = {
  loggedDays: number;
  /** Average kcal over days with at least one meal; null if none. */
  averageKcal: number | null;
  /** Logged days at or under the goal. */
  daysOnTarget: number;
};

export function summarize(totals: DayTotal[], goal: number): HistorySummary {
  const logged = totals.filter((day) => day.mealCount > 0);
  const kcal = logged.reduce((sum, day) => sum + day.total.kcal, 0);
  return {
    loggedDays: logged.length,
    averageKcal: logged.length > 0 ? Math.round(kcal / logged.length) : null,
    daysOnTarget: logged.filter((day) => day.total.kcal <= goal).length,
  };
}
