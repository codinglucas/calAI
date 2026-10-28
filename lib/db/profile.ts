import { cache } from "react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

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
