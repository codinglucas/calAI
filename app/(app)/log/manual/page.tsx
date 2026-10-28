import type { Metadata } from "next";
import { Suspense } from "react";
import { saveMeal } from "@/app/(app)/meals/actions";
import { emptyItem } from "@/components/meals/formValues";
import { MealForm } from "@/components/meals/MealForm";
import { MealFormSkeleton } from "@/components/meals/MealFormSkeleton";
import { hourInZone, utcToLocalTime } from "@/lib/dates";
import { getProfile } from "@/lib/db/profile";
import { mealTypeForHour } from "@/lib/nutrition";
import { MEAL_TYPES, type MealType } from "@/lib/validation/meal";

export const metadata: Metadata = { title: "Add meal" };

export default function ManualEntryPage({ searchParams }: PageProps<"/log/manual">) {
  return (
    <>
      <h1 className="mb-6 text-2xl font-semibold">Add meal</h1>
      <Suspense fallback={<MealFormSkeleton />}>
        <NewMealForm searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function NewMealForm({ searchParams }: Pick<PageProps<"/log/manual">, "searchParams">) {
  const [{ type }, { timezone }] = await Promise.all([searchParams, getProfile()]);
  const now = new Date();
  // ?type=lunch comes from the "Add" links on the Today page.
  const mealType = MEAL_TYPES.includes(type as MealType)
    ? (type as MealType)
    : mealTypeForHour(hourInZone(now, timezone));

  return (
    <MealForm
      action={saveMeal.bind(null, null)}
      initialValues={{
        mealType,
        eatenAtLocal: utcToLocalTime(now, timezone),
        items: [emptyItem()],
      }}
      submitLabel="Log meal"
    />
  );
}
