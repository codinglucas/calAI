import Link from "next/link";
import { formatTime } from "@/lib/dates";
import type { Meal } from "@/lib/db/meals";
import { formatKcal, sumNutrients } from "@/lib/nutrition";
import { DeleteMealButton } from "./DeleteMealButton";

export function MealCard({ meal, timeZone }: { meal: Meal; timeZone: string }) {
  const total = sumNutrients(meal.items);

  return (
    <article className="border-border bg-card rounded-2xl border p-4">
      <div className="flex items-baseline justify-between">
        <time dateTime={meal.eatenAt} className="text-muted text-sm">
          {formatTime(meal.eatenAt, timeZone)}
        </time>
        <span className="font-semibold tabular-nums">{formatKcal(total.kcal)} kcal</span>
      </div>

      <ul className="mt-2 flex flex-col gap-1">
        {meal.items.map((item) => (
          <li key={item.id} className="flex justify-between gap-3 text-sm">
            <span className="truncate">
              {item.name}
              <span className="text-muted"> · {item.grams}g</span>
            </span>
            <span className="text-muted shrink-0 tabular-nums">{formatKcal(item.kcal)}</span>
          </li>
        ))}
      </ul>

      <div className="border-border mt-3 flex items-center justify-between border-t pt-3">
        <span className="text-muted text-xs tabular-nums">
          P {total.protein_g}g · C {total.carbs_g}g · F {total.fat_g}g
        </span>
        <div className="flex gap-2">
          <Link
            href={`/meals/${meal.id}/edit`}
            className="border-border hover:bg-border/40 inline-flex h-9 items-center rounded-xl border px-3 text-sm font-medium"
          >
            Edit
          </Link>
          <DeleteMealButton mealId={meal.id} compact />
        </div>
      </div>
    </article>
  );
}
