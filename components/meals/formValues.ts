import type { Meal } from "@/lib/db/meals";
import type { MealType } from "@/lib/validation/meal";
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
