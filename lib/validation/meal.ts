import { z } from "zod";

export const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;
export const ITEM_SOURCES = ["ai", "manual"] as const;
export const CONFIDENCE_LEVELS = ["low", "medium", "high"] as const;

export type MealType = (typeof MEAL_TYPES)[number];
export type ItemSource = (typeof ITEM_SOURCES)[number];
export type Confidence = (typeof CONFIDENCE_LEVELS)[number];

const roundTo1 = (n: number) => Math.round(n * 10) / 10;

// Form fields arrive as strings; an empty field counts as 0.
const amount = (max: number, label: string) =>
  z.coerce
    .number({ error: `${label} must be a number.` })
    .min(0, `${label} can't be negative.`)
    .max(max, `${label} looks too high.`)
    .transform(roundTo1);

export const mealItemSchema = z.object({
  name: z.string().trim().min(1, "Name the food.").max(200, "Keep the name under 200 characters."),
  grams: amount(99_999, "Grams"),
  kcal: amount(20_000, "Calories").transform(Math.round),
  protein_g: amount(9_999, "Protein"),
  carbs_g: amount(9_999, "Carbs"),
  fat_g: amount(9_999, "Fat"),
  source: z.enum(ITEM_SOURCES).default("manual"),
  confidence: z.enum(CONFIDENCE_LEVELS).nullable().default(null),
});

export const mealInputSchema = z.object({
  meal_type: z.enum(MEAL_TYPES, "Choose a meal type."),
  // Wall-clock time in the user's profile time zone (datetime-local format).
  eaten_at_local: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Choose when you ate this."),
  items: z.array(mealItemSchema).min(1, "Add at least one item.").max(50, "That's a lot of items."),
});

export type MealItemInput = z.input<typeof mealItemSchema>;
export type MealItemData = z.output<typeof mealItemSchema>;
export type MealInput = z.input<typeof mealInputSchema>;
export type MealData = z.output<typeof mealInputSchema>;

/** Flattens Zod issues to { "items.0.name": "Name the food.", ... } (first message per path). */
export function issuesByPath(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    result[key] ??= issue.message;
  }
  return result;
}
