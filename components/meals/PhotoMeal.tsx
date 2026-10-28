"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { SaveMealState } from "@/app/(app)/meals/actions";
import type { AnalyzeMealResponse } from "@/app/api/analyze-meal/route";
import { Button } from "@/components/ui/Button";
import type { MealAnalysis } from "@/lib/ai/analyzeMeal";
import { resizeToJpeg } from "@/lib/image/resizeImage";
import type { MealInput } from "@/lib/validation/meal";
import { itemValuesFromAnalysis, type MealFormValues } from "./formValues";
import { MealForm } from "./MealForm";

type PhotoMealProps = {
  action: (prev: SaveMealState, input: MealInput) => Promise<SaveMealState>;
  defaults: Omit<MealFormValues, "items">;
};

type Step =
  | { name: "pick" }
  | { name: "analyzing" }
  | { name: "confirm"; analysis: MealAnalysis; id: string }
  | { name: "error"; message: string };

/**
 * Photo → estimate → confirm. The photo stays in the browser apart from the
 * one analysis request; only the confirmed items are saved, never the image.
 */
export function PhotoMeal({ action, defaults }: PhotoMealProps) {
  const [step, setStep] = useState<Step>({ name: "pick" });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);

  // Free the preview's memory when it is replaced or the page closes.
  useEffect(() => () => void (previewUrl && URL.revokeObjectURL(previewUrl)), [previewUrl]);
  useEffect(() => () => request.current?.abort(), []);

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
      photo = await resizeToJpeg(file);
    } catch {
      setPreviewUrl(null);
      setStep({ name: "error", message: "We couldn't open that photo. Try a JPEG or PNG." });
      return;
    }
    setPreviewUrl(URL.createObjectURL(photo));

    const body = new FormData();
    body.append("photo", photo, "meal.jpg");
    try {
      const response = await fetch("/api/analyze-meal", {
        method: "POST",
        body,
        signal: controller.signal,
      });
      const result = (await response.json()) as AnalyzeMealResponse;
      if (!result.ok) {
        setStep({ name: "error", message: result.error });
      } else if (result.analysis.items.length === 0) {
        setStep({
          name: "error",
          message: result.analysis.notes || "We couldn't find any food in that photo.",
        });
      } else {
        setStep({ name: "confirm", analysis: result.analysis, id: crypto.randomUUID() });
      }
    } catch {
      if (controller.signal.aborted) return;
      setStep({ name: "error", message: "Couldn't reach the server. Check your connection." });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {previewUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- local blob URL, nothing to optimize
        <img
          src={previewUrl}
          alt="Your meal"
          className="border-border max-h-72 w-full rounded-2xl border object-cover"
        />
      )}

      {step.name === "pick" && (
        <p className="text-muted text-sm">
          Take a photo of your meal and we&apos;ll estimate the calories and macros. You can fix
          anything before it&apos;s saved. The photo itself is never stored.
        </p>
      )}

      {step.name === "analyzing" && (
        <p role="status" className="text-muted animate-pulse text-sm">
          Estimating your meal…
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
