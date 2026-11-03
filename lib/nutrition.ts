import type { MealType } from "@/lib/validation/meal";

export type Nutrients = {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

export type MacroKey = "protein_g" | "carbs_g" | "fat_g";

/** Daily goals in grams; null means no goal for that macro. */
export type MacroGoals = Record<MacroKey, number | null>;

/**
 * goalKind "minimum" is a target to reach, so going over is fine; "limit" is a
 * ceiling, so going over counts as over, like calories do.
 */
export const MACROS: { key: MacroKey; label: string; goalKind: "minimum" | "limit" }[] = [
  { key: "protein_g", label: "Protein", goalKind: "minimum" },
  { key: "carbs_g", label: "Carbs", goalKind: "limit" },
  { key: "fat_g", label: "Fat", goalKind: "limit" },
];

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

/** Rescales an item's nutrients to a new weight, e.g. from a label's serving to the amount eaten. */
export function scaleToGrams<T extends Nutrients & { grams: number }>(item: T, grams: number): T {
  const factor = grams / item.grams;
  return {
    ...item,
    grams,
    kcal: item.kcal * factor,
    protein_g: item.protein_g * factor,
    carbs_g: item.carbs_g * factor,
    fat_g: item.fat_g * factor,
  };
}

const KCAL_PER_GRAM: Record<MacroKey, number> = { protein_g: 4, carbs_g: 4, fat_g: 9 };

/** Share of calories per macro behind suggested goals. */
export const SUGGESTED_MACRO_SPLIT: Record<MacroKey, number> = {
  protein_g: 0.3,
  carbs_g: 0.45,
  fat_g: 0.25,
};

/** Calories implied by macro grams. */
export const kcalFromMacros = (macros: Record<MacroKey, number>) =>
  macros.protein_g * KCAL_PER_GRAM.protein_g +
  macros.carbs_g * KCAL_PER_GRAM.carbs_g +
  macros.fat_g * KCAL_PER_GRAM.fat_g;

/** Macro goals in whole grams for a calorie goal, using SUGGESTED_MACRO_SPLIT. */
export function suggestMacros(kcal: number): Record<MacroKey, number> {
  const grams = (key: MacroKey) =>
    Math.round((kcal * SUGGESTED_MACRO_SPLIT[key]) / KCAL_PER_GRAM[key]);
  return { protein_g: grams("protein_g"), carbs_g: grams("carbs_g"), fat_g: grams("fat_g") };
}

/** Best guess at the meal type from the local hour, for new meals. */
export function mealTypeForHour(hour: number): MealType {
  if (hour >= 4 && hour < 11) return "breakfast";
  if (hour >= 11 && hour < 15) return "lunch";
  if (hour >= 17 && hour < 22) return "dinner";
  return "snack";
}

export const formatKcal = (kcal: number) => kcal.toLocaleString("en-US");
