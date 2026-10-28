"use client";

import type { Confidence, ItemSource } from "@/lib/validation/meal";

/** One item as edited in the form: numbers stay strings until submit. */
export type ItemDraft = {
  key: string;
  name: string;
  grams: string;
  kcal: string;
  protein_g: string;
  carbs_g: string;
  fat_g: string;
  source: ItemSource;
  confidence: Confidence | null;
};

type NumericField = "grams" | "kcal" | "protein_g" | "carbs_g" | "fat_g";

const numericFields: { field: NumericField; label: string }[] = [
  { field: "grams", label: "Grams" },
  { field: "kcal", label: "kcal" },
  { field: "protein_g", label: "Protein" },
  { field: "carbs_g", label: "Carbs" },
  { field: "fat_g", label: "Fat" },
];

const confidenceStyles: Record<Confidence, string> = {
  high: "bg-accent/15 text-accent",
  medium: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  low: "bg-danger/15 text-danger",
};

type MealItemFieldsProps = {
  item: ItemDraft;
  index: number;
  errors: Record<string, string>;
  canRemove: boolean;
  onChange: (patch: Partial<ItemDraft>) => void;
  onRemove: () => void;
};

export function MealItemFields({
  item,
  index,
  errors,
  canRemove,
  onChange,
  onRemove,
}: MealItemFieldsProps) {
  const id = (field: string) => `item-${item.key}-${field}`;
  const error = (field: string) => errors[`items.${index}.${field}`];
  const firstNumericError = numericFields.map(({ field }) => error(field)).find(Boolean);

  return (
    <div className="border-border bg-card flex flex-col gap-3 rounded-2xl border p-3">
      <div className="flex items-start gap-2">
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor={id("name")} className="sr-only">
            Food name
          </label>
          <input
            id={id("name")}
            value={item.name}
            onChange={(event) => onChange({ name: event.target.value })}
            placeholder="Food, e.g. Greek yogurt"
            aria-invalid={error("name") ? true : undefined}
            className="border-border bg-background focus:border-accent aria-invalid:border-danger h-11 rounded-lg border px-3 text-base outline-none"
          />
          {error("name") && <p className="text-danger text-sm">{error("name")}</p>}
        </div>
        {item.confidence && (
          <span
            className={`mt-2.5 rounded-full px-2 py-0.5 text-xs font-medium ${confidenceStyles[item.confidence]}`}
            title="How confident the AI is in this estimate"
          >
            {item.confidence}
          </span>
        )}
        <button
          type="button"
          onClick={onRemove}
          disabled={!canRemove}
          aria-label={`Remove ${item.name || "item"}`}
          className="text-muted hover:text-danger flex size-11 shrink-0 items-center justify-center rounded-lg text-xl disabled:invisible"
        >
          ×
        </button>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {numericFields.map(({ field, label }) => (
          <div key={field} className="flex flex-col gap-1">
            <label htmlFor={id(field)} className="text-muted text-xs">
              {label}
            </label>
            <input
              id={id(field)}
              value={item[field]}
              onChange={(event) => onChange({ [field]: event.target.value })}
              inputMode="decimal"
              placeholder="0"
              aria-invalid={error(field) ? true : undefined}
              className="border-border bg-background focus:border-accent aria-invalid:border-danger h-11 w-full min-w-0 rounded-lg border px-2 text-base tabular-nums outline-none"
            />
          </div>
        ))}
      </div>
      {firstNumericError && <p className="text-danger text-sm">{firstNumericError}</p>}
    </div>
  );
}
