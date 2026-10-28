import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { saveMeal } from "@/app/(app)/meals/actions";
import { newMealDefaults } from "@/components/meals/formValues";
import { PhotoMeal } from "@/components/meals/PhotoMeal";
import { getProfile } from "@/lib/db/profile";

export const metadata: Metadata = { title: "Photo" };

export default function PhotoEntryPage({ searchParams }: PageProps<"/log/photo">) {
  return (
    <>
      <div className="mb-6 flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Snap a meal</h1>
        <Link href="/log/manual" className="text-accent text-sm font-medium">
          Enter manually
        </Link>
      </div>
      <Suspense fallback={<div className="bg-border/60 h-12 animate-pulse rounded-xl" />}>
        <NewPhotoMeal searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function NewPhotoMeal({ searchParams }: Pick<PageProps<"/log/photo">, "searchParams">) {
  const [{ type }, { timezone }] = await Promise.all([searchParams, getProfile()]);
  return (
    <PhotoMeal action={saveMeal.bind(null, null)} defaults={newMealDefaults(type, timezone)} />
  );
}
