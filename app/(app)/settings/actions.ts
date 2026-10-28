"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { updateProfile } from "@/lib/db/profile";
import { settingsSchema } from "@/lib/validation/profile";

export type SettingsState = {
  fieldErrors?: Partial<Record<"daily_calorie_goal" | "timezone", string>>;
  error?: string;
  /** Set after a successful save, so the form can say so. */
  savedAt?: number;
};

export async function saveSettings(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const parsed = settingsSchema.safeParse({
    daily_calorie_goal: formData.get("daily_calorie_goal"),
    timezone: formData.get("timezone"),
  });
  if (!parsed.success) {
    const { fieldErrors } = z.flattenError(parsed.error);
    return {
      fieldErrors: {
        daily_calorie_goal: fieldErrors.daily_calorie_goal?.[0],
        timezone: fieldErrors.timezone?.[0],
      },
    };
  }

  try {
    await updateProfile(parsed.data);
  } catch (error) {
    console.error(error);
    return { error: "Couldn't save your settings. Please try again." };
  }

  // The goal and time zone change every page that shows totals or days.
  revalidatePath("/", "layout");
  return { savedAt: Date.now() };
}
