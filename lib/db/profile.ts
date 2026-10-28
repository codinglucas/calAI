import { cache } from "react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { SettingsData } from "@/lib/validation/profile";

export type Profile = {
  id: string;
  dailyCalorieGoal: number;
  timezone: string;
};

/** The signed-in user's profile. Cached per request. */
export const getProfile = cache(async (): Promise<Profile> => {
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, daily_calorie_goal, timezone")
    .eq("id", user.id)
    .single();
  if (error) {
    throw new Error(`Couldn't load your profile: ${error.message}`);
  }
  return { id: data.id, dailyCalorieGoal: data.daily_calorie_goal, timezone: data.timezone };
});

export async function updateProfile(settings: SettingsData): Promise<void> {
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ daily_calorie_goal: settings.daily_calorie_goal, timezone: settings.timezone })
    .eq("id", user.id);
  if (error) {
    throw new Error(`Couldn't update your profile: ${error.message}`);
  }
}
