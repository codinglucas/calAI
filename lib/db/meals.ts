import { dayRangeUtc, localTimeToUtc } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import type { Confidence, ItemSource, MealData, MealType } from "@/lib/validation/meal";

// Data access for meals. Every query runs as the signed-in user, so RLS
// limits results to their own rows; callers still check the user first.

export type MealItem = {
  id: string;
  name: string;
  grams: number;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  source: ItemSource;
  confidence: Confidence | null;
};

export type Meal = {
  id: string;
  eatenAt: string;
  mealType: MealType;
  items: MealItem[];
};

const MEAL_COLUMNS =
  "id, eaten_at, meal_type, meal_items (id, name, grams, kcal, protein_g, carbs_g, fat_g, source, confidence, created_at)";

type MealRow = {
  id: string;
  eaten_at: string;
  meal_type: string;
  meal_items: (Omit<MealItem, "source" | "confidence"> & {
    source: string;
    confidence: string | null;
    created_at: string;
  })[];
};

// The database's check constraints guarantee these string columns hold
// valid enum values, so narrowing them here is safe.
function toMeal(row: MealRow): Meal {
  return {
    id: row.id,
    eatenAt: row.eaten_at,
    mealType: row.meal_type as MealType,
    items: [...row.meal_items]
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map(({ created_at: _createdAt, ...item }) => ({
        ...item,
        source: item.source as ItemSource,
        confidence: item.confidence as Confidence | null,
      })),
  };
}

/** Meals eaten on `day` ("YYYY-MM-DD") in the given time zone, oldest first. */
export function getMealsForDay(day: string, timeZone: string): Promise<Meal[]> {
  return getMealsForDays(day, day, timeZone);
}

/** Meals eaten from `firstDay` through `lastDay` (inclusive) in the zone, oldest first. */
export async function getMealsForDays(
  firstDay: string,
  lastDay: string,
  timeZone: string,
): Promise<Meal[]> {
  const { start } = dayRangeUtc(firstDay, timeZone);
  const { end } = dayRangeUtc(lastDay, timeZone);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("meals")
    .select(MEAL_COLUMNS)
    .gte("eaten_at", start)
    .lt("eaten_at", end)
    .order("eaten_at");
  if (error) {
    throw new Error(`Couldn't load meals: ${error.message}`);
  }
  return data.map(toMeal);
}

export async function getMeal(id: string): Promise<Meal | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("meals")
    .select(MEAL_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) {
    throw new Error(`Couldn't load meal: ${error.message}`);
  }
  return data ? toMeal(data) : null;
}

function toRpcArgs(meal: MealData, timeZone: string) {
  return {
    p_meal_type: meal.meal_type,
    p_eaten_at: localTimeToUtc(meal.eaten_at_local, timeZone),
    p_items: meal.items,
  };
}

/** Creates a meal and its items atomically. Returns the new meal id. */
export async function createMeal(meal: MealData, timeZone: string): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_meal", toRpcArgs(meal, timeZone));
  if (error) {
    throw new Error(`Couldn't save meal: ${error.message}`);
  }
  return data;
}

/** Replaces a meal's details and items atomically. */
export async function updateMeal(id: string, meal: MealData, timeZone: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_meal", {
    p_meal_id: id,
    ...toRpcArgs(meal, timeZone),
  });
  if (error) {
    throw new Error(`Couldn't update meal: ${error.message}`);
  }
}

export async function deleteMeal(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("meals").delete().eq("id", id);
  if (error) {
    throw new Error(`Couldn't delete meal: ${error.message}`);
  }
}
