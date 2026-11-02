"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { SaveMealState } from "@/app/(app)/meals/actions";
import type { AnalyzeMealResponse } from "@/app/api/analyze-meal/route";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import type { AnalysisMode, AnalyzedItem, MealAnalysis } from "@/lib/ai/analyzeMeal";
import { nextClientId } from "@/lib/clientId";
import { resizeToJpeg } from "@/lib/image/resizeImage";
import { scaleToGrams } from "@/lib/nutrition";
import type { MealInput } from "@/lib/validation/meal";
import { itemValuesFromAnalysis, type MealFormValues } from "./formValues";
import { MealForm } from "./MealForm";

type PhotoMealProps = {
  action: (prev: SaveMealState, input: MealInput) => Promise<SaveMealState>;
  defaults: Omit<MealFormValues, "items">;
};

// Label print is small, so label photos keep more detail than meal photos.
const LABEL_MAX_SIDE = 1600;

type Step =
  | { name: "pick" }
  | { name: "analyzing" }
  | { name: "amount"; label: AnalyzedItem; notes: string }
  | { name: "confirm"; analysis: MealAnalysis; id: string }
  | { name: "error"; message: string };

/**
 * Photo → estimate → confirm, with an amount step for labels, whose values are
 * per serving rather than for what was eaten. The photo stays in the browser apart from the
 * one analysis request; only the confirmed items are saved, never the image.
 */
export function PhotoMeal({ action, defaults }: PhotoMealProps) {
  const [mode, setMode] = useState<AnalysisMode>("meal");
  const [step, setStep] = useState<Step>({ name: "pick" });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);

  // Free the preview's memory when it is replaced or the page closes.
  useEffect(() => () => void (previewUrl && URL.revokeObjectURL(previewUrl)), [previewUrl]);
  useEffect(() => () => request.current?.abort(), []);

  function changeMode(next: AnalysisMode) {
    setMode(next);
    setStep({ name: "pick" });
    setPreviewUrl(null);
  }

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Reset so choosing the same photo again still fires onChange.
    event.target.value = "";
    if (!file) return;

    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setStep({ name: "analyzing" });

    let photo: Blob;
    try {
      photo = await resizeToJpeg(file, mode === "label" ? LABEL_MAX_SIDE : undefined);
    } catch {
      setPreviewUrl(null);
      setStep({ name: "error", message: "We couldn't open that photo. Try a JPEG or PNG." });
      return;
    }
    setPreviewUrl(URL.createObjectURL(photo));

    const body = new FormData();
    body.append("photo", photo, "meal.jpg");
    body.append("mode", mode);
    let result: AnalyzeMealResponse;
    try {
      const response = await fetch("/api/analyze-meal", {
        method: "POST",
        body,
        signal: controller.signal,
      });
      result = (await response.json()) as AnalyzeMealResponse;
    } catch {
      if (controller.signal.aborted) return;
      setStep({ name: "error", message: "Couldn't reach the server. Check your connection." });
      return;
    }

    if (!result.ok) {
      setStep({ name: "error", message: result.error });
    } else if (result.analysis.items.length === 0) {
      setStep({
        name: "error",
        message:
          result.analysis.notes ||
          (mode === "label"
            ? "We couldn't read a nutrition label in that photo."
            : "We couldn't find any food in that photo."),
      });
    } else if (mode === "label") {
      setStep({ name: "amount", label: result.analysis.items[0], notes: result.analysis.notes });
    } else {
      setStep({ name: "confirm", analysis: result.analysis, id: nextClientId("analysis") });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {step.name !== "analyzing" && <ModeSwitch mode={mode} onChange={changeMode} />}

      {previewUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- local blob URL, nothing to optimize
        <img
          src={previewUrl}
          alt={mode === "label" ? "The nutrition label" : "Your meal"}
          className="border-border max-h-72 w-full rounded-2xl border object-cover"
        />
      )}

      {step.name === "pick" && (
        <p className="text-muted text-sm">
          {mode === "label"
            ? "Take a close, flat photo of the nutrition label and we'll read the numbers. "
            : "Take a photo of your meal and we'll estimate the calories and macros. "}
          You can fix anything before it&apos;s saved. The photo itself is never stored.
        </p>
      )}

      {step.name === "analyzing" && (
        <p role="status" className="text-muted animate-pulse text-sm">
          {mode === "label" ? "Reading the label…" : "Estimating your meal…"}
        </p>
      )}

      {step.name === "error" && (
        <div role="alert" className="border-danger/40 rounded-2xl border p-4 text-sm">
          <p>{step.message}</p>
          <Link href="/log/manual" className="text-accent mt-2 inline-block font-medium">
            Enter it manually →
          </Link>
        </div>
      )}

      {step.name !== "analyzing" && (
        <PhotoPicker onChange={handleFile} hasPhoto={step.name !== "pick"} />
      )}

      {step.name === "amount" && (
        <LabelAmount
          label={step.label}
          notes={step.notes}
          onConfirm={(item) =>
            setStep({
              name: "confirm",
              analysis: { items: [item], notes: step.notes },
              id: nextClientId("analysis"),
            })
          }
        />
      )}

      {step.name === "confirm" && (
        <>
          {step.analysis.notes && (
            <p className="bg-card border-border rounded-2xl border p-4 text-sm">
              {step.analysis.notes}
            </p>
          )}
          <MealForm
            // A new analysis starts a fresh form.
            key={step.id}
            action={action}
            initialValues={{ ...defaults, items: itemValuesFromAnalysis(step.analysis.items) }}
            submitLabel="Log meal"
          />
        </>
      )}
    </div>
  );
}

function ModeSwitch({
  mode,
  onChange,
}: {
  mode: AnalysisMode;
  onChange: (mode: AnalysisMode) => void;
}) {
  const options: { value: AnalysisMode; label: string }[] = [
    { value: "meal", label: "Meal" },
    { value: "label", label: "Nutrition label" },
  ];
  return (
    <div
      role="group"
      aria-label="What to photograph"
      className="border-border flex gap-1 rounded-xl border p-1"
    >
      {options.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          aria-pressed={mode === value}
          onClick={() => mode !== value && onChange(value)}
          className="text-muted aria-pressed:bg-accent/10 aria-pressed:text-accent h-9 flex-1 rounded-lg text-sm font-medium"
        >
          {label}
        </button>
      ))}
    </div>
  );
}

const SERVING_SHORTCUTS = [
  { label: "½", servings: 0.5 },
  { label: "1", servings: 1 },
  { label: "2", servings: 2 },
];

/** Asks how much was eaten, since a label only gives the values per serving. */
function LabelAmount({
  label,
  notes,
  onConfirm,
}: {
  label: AnalyzedItem;
  notes: string;
  onConfirm: (item: AnalyzedItem) => void;
}) {
  const servingGrams = (servings: number) => Math.round(label.grams * servings * 10) / 10;
  const [grams, setGrams] = useState(String(servingGrams(1)));
  const amount = Number(grams);
  const valid = amount > 0 && amount <= 99_999;
  const scaled = scaleToGrams(label, valid ? amount : label.grams);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (valid) onConfirm(scaled);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {notes && <p className="bg-card border-border rounded-2xl border p-4 text-sm">{notes}</p>}
      <p className="text-sm">
        <span className="font-medium">{label.name}:</span> {Math.round(label.kcal)} kcal per{" "}
        {Math.round(label.grams)} g on the label.
      </p>
      <div role="group" aria-labelledby="serving-shortcuts" className="flex flex-col gap-1.5">
        <p id="serving-shortcuts" className="text-sm font-medium">
          Servings ({Math.round(label.grams)} g each)
        </p>
        <div className="flex gap-2">
          {SERVING_SHORTCUTS.map((shortcut) => (
            <Button
              key={shortcut.label}
              type="button"
              variant="secondary"
              className="aria-pressed:border-accent aria-pressed:text-accent flex-1"
              aria-pressed={amount === servingGrams(shortcut.servings)}
              onClick={() => setGrams(String(servingGrams(shortcut.servings)))}
            >
              {shortcut.label}
            </Button>
          ))}
        </div>
      </div>
      <TextField
        label="How much did you have? (g or ml)"
        name="amount"
        type="number"
        inputMode="decimal"
        min={1}
        max={99_999}
        step="any"
        value={grams}
        onChange={(event) => setGrams(event.target.value)}
        required
      />
      <p className="text-muted text-sm" aria-live="polite">
        {Math.round(scaled.kcal)} kcal · {Math.round(scaled.protein_g)} g protein ·{" "}
        {Math.round(scaled.carbs_g)} g carbs · {Math.round(scaled.fat_g)} g fat
      </p>
      <Button type="submit" disabled={!valid}>
        Continue
      </Button>
    </form>
  );
}

function PhotoPicker({
  onChange,
  hasPhoto,
}: {
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  hasPhoto: boolean;
}) {
  const camera = useRef<HTMLInputElement>(null);
  const library = useRef<HTMLInputElement>(null);

  return (
    <div className="flex gap-3">
      <input
        ref={camera}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onChange}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />
      <input
        ref={library}
        type="file"
        accept="image/*"
        onChange={onChange}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />
      <Button
        type="button"
        variant={hasPhoto ? "secondary" : "primary"}
        className="flex-1"
        onClick={() => camera.current?.click()}
      >
        {hasPhoto ? "Retake" : "Take photo"}
      </Button>
      <Button type="button" variant="secondary" onClick={() => library.current?.click()}>
        Choose
      </Button>
    </div>
  );
}
