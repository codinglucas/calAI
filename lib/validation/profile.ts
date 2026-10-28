import { z } from "zod";
import { isTimeZone } from "@/lib/dates";

// Same bounds as the database check constraints on profiles.
export const MIN_CALORIE_GOAL = 500;
export const MAX_CALORIE_GOAL = 10_000;

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
});

export type SettingsData = z.output<typeof settingsSchema>;
