import type { Metadata } from "next";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Today" };

export default function TodayPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold">Today</h1>
      <Suspense fallback={<div className="bg-border/60 mt-6 h-32 animate-pulse rounded-2xl" />}>
        <TodaySummary />
      </Suspense>
    </>
  );
}

async function TodaySummary() {
  await requireUser();
  return (
    <section className="border-border bg-card text-muted mt-6 rounded-2xl border p-6 text-center">
      No meals logged yet.
    </section>
  );
}
