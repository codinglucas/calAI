import { formatKcal, type Nutrients } from "@/lib/nutrition";

export function DailySummary({ total, goal }: { total: Nutrients; goal: number }) {
  const remaining = goal - total.kcal;
  const percent = Math.min(100, Math.round((total.kcal / goal) * 100));
  const isOver = remaining < 0;

  return (
    <section className="border-border bg-card rounded-2xl border p-5" aria-label="Daily total">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-4xl font-bold tabular-nums">{formatKcal(total.kcal)}</p>
          <p className="text-muted text-sm">of {formatKcal(goal)} kcal</p>
        </div>
        <p className={`text-right text-sm font-medium ${isOver ? "text-danger" : "text-accent"}`}>
          {isOver ? `${formatKcal(-remaining)} over` : `${formatKcal(remaining)} left`}
        </p>
      </div>

      <div
        className="bg-border mt-4 h-2.5 overflow-hidden rounded-full"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={goal}
        aria-valuenow={total.kcal}
        aria-label="Calories eaten compared with your daily goal"
      >
        <div
          className={`h-full rounded-full transition-all ${isOver ? "bg-danger" : "bg-accent"}`}
          style={{ width: `${percent}%` }}
        />
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
        {[
          ["Protein", total.protein_g],
          ["Carbs", total.carbs_g],
          ["Fat", total.fat_g],
        ].map(([label, grams]) => (
          <div key={label} className="bg-background rounded-xl py-2">
            <dt className="text-muted text-xs">{label}</dt>
            <dd className="font-semibold tabular-nums">{grams}g</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
