"use client";

import { startTransition, useActionState, useState } from "react";
import { saveSettings, type SettingsState } from "@/app/(app)/settings/actions";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { MAX_CALORIE_GOAL, MIN_CALORIE_GOAL } from "@/lib/validation/profile";

type SettingsFormProps = {
  dailyCalorieGoal: number;
  timezone: string;
  /** IANA zone names, computed on the server so both renders match. */
  timeZones: string[];
};

export function SettingsForm({ dailyCalorieGoal, timezone, timeZones }: SettingsFormProps) {
  const [state, action, isPending] = useActionState<SettingsState, FormData>(saveSettings, {});
  const [zone, setZone] = useState(timezone);
  const errors = state.fieldErrors ?? {};

  function applyDeviceZone() {
    const deviceZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (timeZones.includes(deviceZone)) {
      setZone(deviceZone);
    }
  }

  // Submitting by hand instead of <form action> skips React's automatic form
  // reset, which put the controlled time zone <select> back on its first
  // option (Africa/Abidjan) while state still held the real zone.
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => action(formData));
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <TextField
        label="Daily calorie goal (kcal)"
        name="daily_calorie_goal"
        type="number"
        inputMode="numeric"
        min={MIN_CALORIE_GOAL}
        max={MAX_CALORIE_GOAL}
        step={10}
        defaultValue={dailyCalorieGoal}
        error={errors.daily_calorie_goal}
        required
      />

      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between">
          <label htmlFor="timezone" className="text-sm font-medium">
            Time zone
          </label>
          <button
            type="button"
            onClick={applyDeviceZone}
            className="text-accent text-sm font-medium"
          >
            Use this device&apos;s
          </button>
        </div>
        <select
          id="timezone"
          name="timezone"
          value={zone}
          onChange={(event) => setZone(event.target.value)}
          aria-invalid={errors.timezone ? true : undefined}
          className="border-border bg-card focus:border-accent focus:ring-accent/30 aria-invalid:border-danger h-12 rounded-xl border px-3 text-base outline-none focus:ring-2"
        >
          {timeZones.map((name) => (
            <option key={name} value={name}>
              {name.replaceAll("_", " ")}
            </option>
          ))}
        </select>
        {errors.timezone && <p className="text-danger text-sm">{errors.timezone}</p>}
        <p className="text-muted text-sm">
          Decides when your day starts and ends. Changing it regroups past meals by the new zone.
        </p>
      </div>

      {state.error && (
        <p role="alert" className="text-danger text-sm">
          {state.error}
        </p>
      )}
      {state.savedAt && !isPending && (
        <p role="status" className="text-accent text-sm">
          Saved.
        </p>
      )}
      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : "Save settings"}
      </Button>
    </form>
  );
}
