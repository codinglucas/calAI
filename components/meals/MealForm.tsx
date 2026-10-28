"use client";

import { type ReactNode, startTransition, useActionState, useState } from "react";
import type { SaveMealState } from "@/app/(app)/meals/actions";
import { Button } from "@/components/ui/Button";
import { formatKcal, MEAL_TYPE_LABELS, sumNutrients } from "@/lib/nutrition";
import { type MealInput, type MealItemInput, MEAL_TYPES } from "@/lib/validation/meal";
import { emptyItem, type ItemValues, type MealFormValues } from "./formValues";
import { type ItemDraft, MealItemFields } from "./MealItemFields";

type MealFormProps = {
  action: (prev: SaveMealState, input: MealInput) => Promise<SaveMealState>;
  initialValues: MealFormValues;
  submitLabel: string;
  /** Extra controls rendered next to the submit button (e.g. Delete). */
  secondaryAction?: ReactNode;
};

// Keys end up in element ids, so initial ones must match between the server
// render and hydration; only items added later get random keys.
const withKey = (item: ItemValues, key: string = crypto.randomUUID()): ItemDraft => ({
  ...item,
  key,
});

/**
 * Editable meal: type, time, and a list of items with a live total. Used for
 * manual entry, editing, and (Phase 3) confirming the AI's estimate.
 */
export function MealForm({ action, initialValues, submitLabel, secondaryAction }: MealFormProps) {
  const [state, dispatch, isPending] = useActionState(action, {});
  const [mealType, setMealType] = useState(initialValues.mealType);
  const [eatenAtLocal, setEatenAtLocal] = useState(initialValues.eatenAtLocal);
  const [items, setItems] = useState(() =>
    initialValues.items.map((item, i) => withKey(item, `initial-${i}`)),
  );
  const errors = state.fieldErrors ?? {};
  const total = sumNutrients(items);

  function updateItem(key: string, patch: Partial<ItemDraft>) {
    setItems((current) => current.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload: MealInput = {
      meal_type: mealType,
      eaten_at_local: eatenAtLocal,
      items: items.map(({ key: _key, ...item }): MealItemInput => item),
    };
    startTransition(() => dispatch(payload));
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">Meal</legend>
        <div className="grid grid-cols-4 gap-2">
          {MEAL_TYPES.map((type) => (
            <label
              key={type}
              className="border-border bg-card has-checked:border-accent has-checked:bg-accent has-checked:text-accent-foreground has-focus-visible:ring-accent/40 flex h-11 cursor-pointer items-center justify-center rounded-xl border text-sm font-medium has-focus-visible:ring-2"
            >
              <input
                type="radio"
                name="meal_type"
                value={type}
                checked={mealType === type}
                onChange={() => setMealType(type)}
                className="sr-only"
              />
              {MEAL_TYPE_LABELS[type]}
            </label>
          ))}
        </div>
        {errors.meal_type && <p className="text-danger text-sm">{errors.meal_type}</p>}
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="eaten_at" className="text-sm font-medium">
          When
        </label>
        <input
          id="eaten_at"
          type="datetime-local"
          value={eatenAtLocal}
          onChange={(event) => setEatenAtLocal(event.target.value)}
          className="border-border bg-card focus:border-accent focus:ring-accent/30 h-12 rounded-xl border px-3 text-base outline-none focus:ring-2"
        />
        {errors.eaten_at_local && <p className="text-danger text-sm">{errors.eaten_at_local}</p>}
      </div>

      <section className="flex flex-col gap-3" aria-label="Items">
        <h2 className="text-sm font-medium">Items</h2>
        {items.map((item, index) => (
          <MealItemFields
            key={item.key}
            item={item}
            index={index}
            errors={errors}
            canRemove={items.length > 1}
            onChange={(patch) => updateItem(item.key, patch)}
            onRemove={() => setItems((current) => current.filter((i) => i.key !== item.key))}
          />
        ))}
        {errors.items && <p className="text-danger text-sm">{errors.items}</p>}
        <Button
          type="button"
          variant="secondary"
          onClick={() => setItems((current) => [...current, withKey(emptyItem())])}
        >
          + Add item
        </Button>
      </section>

      {/* Sticks above the bottom nav so the total and Save stay in reach. */}
      <div className="border-border bg-background/95 sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] -mx-5 flex flex-col gap-3 border-t px-5 py-4 backdrop-blur">
        <div className="flex items-baseline justify-between">
          <span className="text-muted text-sm">Total</span>
          <span className="text-lg font-semibold tabular-nums">{formatKcal(total.kcal)} kcal</span>
        </div>
        <p className="text-muted -mt-2 text-right text-xs tabular-nums">
          P {total.protein_g}g · C {total.carbs_g}g · F {total.fat_g}g
        </p>
        {state.error && (
          <p role="alert" className="text-danger text-sm">
            {state.error}
          </p>
        )}
        <div className="flex gap-3">
          {secondaryAction}
          <Button type="submit" disabled={isPending} className="flex-1">
            {isPending ? "Saving…" : submitLabel}
          </Button>
        </div>
      </div>
    </form>
  );
}
