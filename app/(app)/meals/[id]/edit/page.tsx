import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { saveMeal } from "@/app/(app)/meals/actions";
import { DeleteMealButton } from "@/components/meals/DeleteMealButton";
import { itemValuesFromMeal } from "@/components/meals/formValues";
import { MealForm } from "@/components/meals/MealForm";
import { MealFormSkeleton } from "@/components/meals/MealFormSkeleton";
import { utcToLocalTime } from "@/lib/dates";
import { getMeal } from "@/lib/db/meals";
import { getProfile } from "@/lib/db/profile";

export const metadata: Metadata = { title: "Edit meal" };

export default function EditMealPage({ params }: PageProps<"/meals/[id]/edit">) {
  return (
    <>
      <h1 className="mb-6 text-2xl font-semibold">Edit meal</h1>
      <Suspense fallback={<MealFormSkeleton />}>
        <EditMealForm params={params} />
      </Suspense>
    </>
  );
}

async function EditMealForm({ params }: Pick<PageProps<"/meals/[id]/edit">, "params">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) {
    notFound();
  }
  const { timezone } = await getProfile();
  // getMeal goes through RLS, so another user's meal id looks like a missing one.
  const meal = await getMeal(id);
  if (!meal) {
    notFound();
  }

  return (
    <MealForm
      action={saveMeal.bind(null, meal.id)}
      initialValues={{
        mealType: meal.mealType,
        eatenAtLocal: utcToLocalTime(meal.eatenAt, timezone),
        items: itemValuesFromMeal(meal),
      }}
      submitLabel="Save changes"
      secondaryAction={<DeleteMealButton mealId={meal.id} />}
    />
  );
}
