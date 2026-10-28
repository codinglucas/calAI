import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { addDays, formatShortDay, todayInZone } from "@/lib/dates";
import { getMealsForDays } from "@/lib/db/meals";
import { getProfile } from "@/lib/db/profile";
import { type DayTotal, dailyTotals, summarize } from "@/lib/history";
import { formatKcal } from "@/lib/nutrition";

export const metadata: Metadata = { title: "History" };

const DAYS = 30;

export default function HistoryPage() {
  return (
    <>
      <h1 className="mb-6 text-2xl font-semibold">Last {DAYS} days</h1>
      <Suspense fallback={<HistorySkeleton />}>
        <History />
      </Suspense>
    </>
  );
}

async function History() {
  const { dailyCalorieGoal: goal, timezone } = await getProfile();
  const today = todayInZone(timezone);
  // Oldest first, ending today.
  const days = Array.from({ length: DAYS }, (_, i) => addDays(today, i - (DAYS - 1)));
  const meals = await getMealsForDays(days[0], today, timezone);
  const totals = dailyTotals(meals, days, timezone);
  const summary = summarize(totals, goal);

  return (
    <div className="flex flex-col gap-6">
      <section className="border-border bg-card rounded-2xl border p-5" aria-label="Summary">
        <dl className="grid grid-cols-3 gap-2 text-center">
          <Stat
            label="Avg / day"
            value={summary.averageKcal === null ? "—" : formatKcal(summary.averageKcal)}
          />
          <Stat label="Days logged" value={`${summary.loggedDays}/${DAYS}`} />
          <Stat label="On target" value={String(summary.daysOnTarget)} />
        </dl>
        <TrendChart totals={totals} goal={goal} />
        <p className="text-muted mt-2 text-xs">
          Goal {formatKcal(goal)} kcal. Averages count only days with meals.
        </p>
      </section>

      <ol className="flex flex-col gap-2">
        {[...totals].reverse().map((day) => (
          <li key={day.day}>
            <DayRow day={day} goal={goal} isToday={day.day === today} />
          </li>
        ))}
      </ol>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted text-xs">{label}</dt>
      <dd className="text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

/** One bar per day, scaled to the larger of the goal and the busiest day. */
function TrendChart({ totals, goal }: { totals: DayTotal[]; goal: number }) {
  const max = Math.max(goal, ...totals.map((day) => day.total.kcal));
  const goalPercent = (goal / max) * 100;

  return (
    // The list below carries the same numbers for screen readers.
    <div className="relative mt-5 flex h-24 items-end gap-0.5" aria-hidden="true">
      <div
        className="border-muted/60 absolute inset-x-0 border-t border-dashed"
        style={{ bottom: `${goalPercent}%` }}
      />
      {totals.map((day) => (
        <div
          key={day.day}
          className={`flex-1 rounded-t-sm ${day.total.kcal > goal ? "bg-danger" : "bg-accent"}`}
          style={{ height: `${(day.total.kcal / max) * 100}%` }}
        />
      ))}
    </div>
  );
}

function DayRow({ day, goal, isToday }: { day: DayTotal; goal: number; isToday: boolean }) {
  const kcal = day.total.kcal;
  const isOver = kcal > goal;
  const href = isToday ? "/today" : `/history/${day.day}`;

  return (
    <Link
      href={href}
      className="border-border bg-card flex flex-col gap-2 rounded-2xl border px-4 py-3"
    >
      <div className="flex items-baseline justify-between">
        <span className="font-medium">{isToday ? "Today" : formatShortDay(day.day)}</span>
        {day.mealCount === 0 ? (
          <span className="text-muted text-sm">Nothing logged</span>
        ) : (
          <span className={`text-sm tabular-nums ${isOver ? "text-danger" : ""}`}>
            {formatKcal(kcal)} kcal
          </span>
        )}
      </div>
      {day.mealCount > 0 && (
        <div className="bg-border h-1.5 overflow-hidden rounded-full">
          <div
            className={`h-full rounded-full ${isOver ? "bg-danger" : "bg-accent"}`}
            style={{ width: `${Math.min(100, (kcal / goal) * 100)}%` }}
          />
        </div>
      )}
    </Link>
  );
}

function HistorySkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-3" aria-hidden="true">
      <div className="bg-border/60 h-48 rounded-2xl" />
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="bg-border/60 h-16 rounded-2xl" />
      ))}
    </div>
  );
}
