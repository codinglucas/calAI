"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createMeal, deleteMeal, updateMeal } from "@/lib/db/meals";
import { getProfile } from "@/lib/db/profile";
import { issuesByPath, type MealInput, mealInputSchema } from "@/lib/validation/meal";

export type SaveMealState = {
  /** Field errors keyed by path, e.g. "items.0.name". */
  fieldErrors?: Record<string, string>;
  error?: string;
};

const mealIdSchema = z.uuid();

/**
 * Creates a meal (mealId null) or replaces an existing one. Bind the id on the
 * server: `saveMeal.bind(null, id)`.
 */
export async function saveMeal(
  mealId: string | null,
  _prev: SaveMealState,
  input: MealInput,
): Promise<SaveMealState> {
  await requireUser();
  const parsed = mealInputSchema.safeParse(input);
  if (!parsed.success) {
    return { fieldErrors: issuesByPath(parsed.error) };
  }
  if (mealId !== null && !mealIdSchema.safeParse(mealId).success) {
    return { error: "That meal doesn't exist." };
  }

  const { timezone } = await getProfile();
  try {
    if (mealId === null) {
      await createMeal(parsed.data, timezone);
    } else {
      await updateMeal(mealId, parsed.data, timezone);
    }
  } catch (error) {
    console.error(error);
    return { error: "Couldn't save the meal. Please try again." };
  }

  revalidatePath("/today");
  redirect("/today");
}

export async function deleteMealAction(mealId: string) {
  await requireUser();
  if (!mealIdSchema.safeParse(mealId).success) {
    return;
  }
  await deleteMeal(mealId);
  revalidatePath("/today");
  redirect("/today");
}
