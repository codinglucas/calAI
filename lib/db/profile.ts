import { cache } from "react";
import { requireUser } from "@/lib/auth";
import type { MacroGoals } from "@/lib/nutrition";
import { createClient } from "@/lib/supabase/server";
import type { SettingsData } from "@/lib/validation/profile";

export type Profile = {
  id: string;
  dailyCalorieGoal: number;
  macroGoals: MacroGoals;
  timezone: string;
};

/** The signed-in user's profile. Cached per request. */
export const getProfile = cache(async (): Promise<Profile> => {
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, daily_calorie_goal, protein_goal_g, carbs_goal_g, fat_goal_g, timezone")
    .eq("id", user.id)
    .single();
  if (error) {
    throw new Error(`Couldn't load your profile: ${error.message}`);
  }
  return {
    id: data.id,
    dailyCalorieGoal: data.daily_calorie_goal,
    macroGoals: {
      protein_g: data.protein_goal_g,
      carbs_g: data.carbs_goal_g,
      fat_g: data.fat_goal_g,
    },
    timezone: data.timezone,
  };
});

export async function updateProfile(settings: SettingsData): Promise<void> {
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      daily_calorie_goal: settings.daily_calorie_goal,
      protein_goal_g: settings.protein_goal_g,
      carbs_goal_g: settings.carbs_goal_g,
      fat_goal_g: settings.fat_goal_g,
      timezone: settings.timezone,
    })
    .eq("id", user.id);
  if (error) {
    throw new Error(`Couldn't update your profile: ${error.message}`);
  }
}
