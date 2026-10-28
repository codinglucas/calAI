import type { Metadata } from "next";
import { Suspense } from "react";
import { saveMeal } from "@/app/(app)/meals/actions";
import { emptyItem, newMealDefaults } from "@/components/meals/formValues";
import { MealForm } from "@/components/meals/MealForm";
import { MealFormSkeleton } from "@/components/meals/MealFormSkeleton";
import { getProfile } from "@/lib/db/profile";

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
  return (
    <MealForm
      action={saveMeal.bind(null, null)}
      initialValues={{ ...newMealDefaults(type, timezone), items: [emptyItem()] }}
      submitLabel="Log meal"
    />
  );
}
