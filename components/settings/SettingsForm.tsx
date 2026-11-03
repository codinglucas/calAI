"use client";

import { startTransition, useActionState, useState } from "react";
import { saveSettings, type SettingsState } from "@/app/(app)/settings/actions";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { formatKcal, kcalFromMacros, type MacroGoals, type MacroKey } from "@/lib/nutrition";
import {
  MAX_CALORIE_GOAL,
  MAX_MACRO_GOAL,
  MIN_CALORIE_GOAL,
  MIN_MACRO_GOAL,
} from "@/lib/validation/profile";

const MACRO_FIELDS = [
  { key: "protein_g", name: "protein_goal_g", label: "Protein (g)" },
  { key: "carbs_g", name: "carbs_goal_g", label: "Carbs (g)" },
  { key: "fat_g", name: "fat_goal_g", label: "Fat (g)" },
] as const;

/** How the macro goals compare with the calorie goal; null until all three are set. */
function macroHint(macros: Record<MacroKey, string>, calorieGoal: string): string | null {
  const grams = {
    protein_g: Number(macros.protein_g),
    carbs_g: Number(macros.carbs_g),
    fat_g: Number(macros.fat_g),
  };
  if (Object.values(grams).some((value) => !(value > 0))) return null;

  const kcal = kcalFromMacros(grams);
  const goal = Number(calorieGoal);
  const summary = `Your macro goals add up to ${formatKcal(kcal)} kcal`;
  if (!(goal > 0)) return `${summary}.`;
  if (kcal === goal) return `${summary}, matching your calorie goal.`;
  const difference = formatKcal(Math.abs(kcal - goal));
  return `${summary}, ${difference} ${kcal > goal ? "over" : "under"} your calorie goal.`;
}

type SettingsFormProps = {
  dailyCalorieGoal: number;
  macroGoals: MacroGoals;
  timezone: string;
  /** IANA zone names, computed on the server so both renders match. */
  timeZones: string[];
};

export function SettingsForm({
  dailyCalorieGoal,
  macroGoals,
  timezone,
  timeZones,
}: SettingsFormProps) {
  const [state, action, isPending] = useActionState<SettingsState, FormData>(saveSettings, {});
  const [zone, setZone] = useState(timezone);
  const [calorieGoal, setCalorieGoal] = useState(String(dailyCalorieGoal));
  const [macros, setMacros] = useState<Record<MacroKey, string>>({
    protein_g: String(macroGoals.protein_g ?? ""),
    carbs_g: String(macroGoals.carbs_g ?? ""),
    fat_g: String(macroGoals.fat_g ?? ""),
  });
  const hint = macroHint(macros, calorieGoal);
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
        value={calorieGoal}
        onChange={(event) => setCalorieGoal(event.target.value)}
        error={errors.daily_calorie_goal}
        required
      />

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1.5 text-sm font-medium">Macro goals (optional)</legend>
        <div className="grid grid-cols-3 gap-3">
          {MACRO_FIELDS.map(({ key, name, label }) => (
            <TextField
              key={key}
              label={label}
              name={name}
              type="number"
              inputMode="numeric"
              min={MIN_MACRO_GOAL}
              max={MAX_MACRO_GOAL}
              step={1}
              value={macros[key]}
              onChange={(event) => setMacros({ ...macros, [key]: event.target.value })}
              error={errors[name]}
            />
          ))}
        </div>
        <p className="text-muted text-sm" aria-live="polite">
          {hint ?? "Leave a macro blank if you don't want a goal for it."}
        </p>
      </fieldset>

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
