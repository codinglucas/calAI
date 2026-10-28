import type { MealType } from "@/lib/validation/meal";

export type Nutrients = {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

/** Sums nutrients. Accepts strings so it can total in-progress form fields. */
export function sumNutrients(
  items: ReadonlyArray<{ [K in keyof Nutrients]: number | string }>,
): Nutrients {
  const toNumber = (value: number | string) => {
    const n = typeof value === "number" ? value : Number(value);
    return Number.isFinite(n) && n > 0 ? n : 0;
  };
  const total = items.reduce<Nutrients>(
    (acc, item) => ({
      kcal: acc.kcal + toNumber(item.kcal),
      protein_g: acc.protein_g + toNumber(item.protein_g),
      carbs_g: acc.carbs_g + toNumber(item.carbs_g),
      fat_g: acc.fat_g + toNumber(item.fat_g),
    }),
    { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
  );
  return {
    kcal: Math.round(total.kcal),
    protein_g: Math.round(total.protein_g),
    carbs_g: Math.round(total.carbs_g),
    fat_g: Math.round(total.fat_g),
  };
}

/** Best guess at the meal type from the local hour, for new meals. */
export function mealTypeForHour(hour: number): MealType {
  if (hour >= 4 && hour < 11) return "breakfast";
  if (hour >= 11 && hour < 15) return "lunch";
  if (hour >= 17 && hour < 22) return "dinner";
  return "snack";
}

export const formatKcal = (kcal: number) => kcal.toLocaleString("en-US");
