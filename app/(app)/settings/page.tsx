import type { Metadata } from "next";
import { Suspense } from "react";
import { SettingsForm } from "@/components/settings/SettingsForm";
import { getProfile } from "@/lib/db/profile";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <>
      <h1 className="mb-6 text-2xl font-semibold">Settings</h1>
      <Suspense fallback={<div className="bg-border/60 h-64 animate-pulse rounded-2xl" />}>
        <Settings />
      </Suspense>
    </>
  );
}

async function Settings() {
  const profile = await getProfile();
  const timeZones = Intl.supportedValuesOf("timeZone");
  // Keep the saved zone selectable even if this runtime lists it differently
  // (e.g. "UTC" or an old alias).
  if (!timeZones.includes(profile.timezone)) {
    timeZones.unshift(profile.timezone);
  }

  return (
    <SettingsForm
      dailyCalorieGoal={profile.dailyCalorieGoal}
      timezone={profile.timezone}
      timeZones={timeZones}
    />
  );
}
