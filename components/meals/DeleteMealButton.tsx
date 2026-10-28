"use client";

import { useState, useTransition } from "react";
import { deleteMealAction } from "@/app/(app)/meals/actions";
import { Button } from "@/components/ui/Button";

/** Two-tap delete: the first tap asks for confirmation, the second deletes. */
export function DeleteMealButton({
  mealId,
  compact = false,
}: {
  mealId: string;
  compact?: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  const size = compact ? "h-9 px-3 text-sm" : "";

  if (!confirming) {
    return (
      <Button
        type="button"
        variant="secondary"
        className={size}
        onClick={() => setConfirming(true)}
      >
        Delete
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="secondary"
      className={`border-danger text-danger ${size}`}
      disabled={isPending}
      onClick={() => startTransition(() => deleteMealAction(mealId))}
      onBlur={() => !isPending && setConfirming(false)}
      autoFocus
    >
      {isPending ? "Deleting…" : "Confirm delete"}
    </Button>
  );
}
