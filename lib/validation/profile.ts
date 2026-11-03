import { z } from "zod";
import { isTimeZone } from "@/lib/dates";

// Same bounds as the database check constraints on profiles.
export const MIN_CALORIE_GOAL = 500;
export const MAX_CALORIE_GOAL = 10_000;
export const MIN_MACRO_GOAL = 1;
export const MAX_MACRO_GOAL = 2_000;

// A blank field means no goal. It has to become null before coercion, which
// would otherwise turn "" into 0.
const macroGoal = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z.coerce
    .number({ error: "Enter a number." })
    .int("Use a whole number.")
    .min(MIN_MACRO_GOAL, `Use at least ${MIN_MACRO_GOAL} g, or leave it blank.`)
    .max(MAX_MACRO_GOAL, `Use at most ${MAX_MACRO_GOAL.toLocaleString("en-US")} g.`)
    .nullable(),
);

export const settingsSchema = z.object({
  daily_calorie_goal: z.coerce
    .number({ error: "Enter a number." })
    .int("Use a whole number.")
    .min(MIN_CALORIE_GOAL, `Set a goal of at least ${MIN_CALORIE_GOAL} kcal.`)
    .max(
      MAX_CALORIE_GOAL,
      `Set a goal of at most ${MAX_CALORIE_GOAL.toLocaleString("en-US")} kcal.`,
    ),
  timezone: z.string().refine(isTimeZone, "Choose a time zone from the list."),
  protein_goal_g: macroGoal,
  carbs_goal_g: macroGoal,
  fat_goal_g: macroGoal,
});

export type SettingsData = z.output<typeof settingsSchema>;
