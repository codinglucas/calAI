import type { AnalyzedItem } from "@/lib/ai/analyzeMeal";
import { hourInZone, utcToLocalTime } from "@/lib/dates";
import type { Meal } from "@/lib/db/meals";
import { mealTypeForHour } from "@/lib/nutrition";
import { MEAL_TYPES, type MealType } from "@/lib/validation/meal";
import type { ItemDraft } from "./MealItemFields";

// Plain (non-client) module so Server Components can build MealForm's
// initial values.

export type ItemValues = Omit<ItemDraft, "key">;

export type MealFormValues = {
  mealType: MealType;
  /** "YYYY-MM-DDTHH:mm" in the user's time zone. */
  eatenAtLocal: string;
  items: ItemValues[];
};

/**
 * Meal type and time for a new meal: the requested type if valid (?type= from
 * the Today page), otherwise a guess from the time of day; the time is now.
 */
export function newMealDefaults(
  requestedType: unknown,
  timeZone: string,
  now = new Date(),
): Omit<MealFormValues, "items"> {
  const mealType = MEAL_TYPES.includes(requestedType as MealType)
    ? (requestedType as MealType)
    : mealTypeForHour(hourInZone(now, timeZone));
  return { mealType, eatenAtLocal: utcToLocalTime(now, timeZone) };
}

export const emptyItem = (): ItemValues => ({
  name: "",
  grams: "",
  kcal: "",
  protein_g: "",
  carbs_g: "",
  fat_g: "",
  source: "manual",
  confidence: null,
});

export const itemValuesFromMeal = (meal: Meal): ItemValues[] =>
  meal.items.map((item) => ({
    name: item.name,
    grams: String(item.grams),
    kcal: String(item.kcal),
    protein_g: String(item.protein_g),
    carbs_g: String(item.carbs_g),
    fat_g: String(item.fat_g),
    source: item.source,
    confidence: item.confidence,
  }));

export const itemValuesFromAnalysis = (items: AnalyzedItem[]): ItemValues[] =>
  items.map((item) => ({
    name: item.name,
    grams: String(Math.round(item.grams)),
    kcal: String(Math.round(item.kcal)),
    protein_g: String(Math.round(item.protein_g * 10) / 10),
    carbs_g: String(Math.round(item.carbs_g * 10) / 10),
    fat_g: String(Math.round(item.fat_g * 10) / 10),
    source: "ai",
    confidence: item.confidence,
  }));
