import { describe, expect, it } from "vitest";
import type { Meal } from "@/lib/db/meals";
import { dailyTotals, summarize } from "@/lib/history";

const meal = (eatenAt: string, kcal: number): Meal => ({
  id: eatenAt,
  eatenAt,
  mealType: "lunch",
  items: [
    {
      id: "item",
      name: "Food",
      grams: 100,
      kcal,
      protein_g: 10,
      carbs_g: 10,
      fat_g: 10,
      source: "manual",
      confidence: null,
    },
  ],
});

const DAYS = ["2026-10-26", "2026-10-27", "2026-10-28"];
const ZONE = "America/New_York";

describe("dailyTotals", () => {
  it("returns one entry per day, in order, with zeros for empty days", () => {
    const totals = dailyTotals([meal("2026-10-27T16:00:00Z", 500)], DAYS, ZONE);
    expect(totals.map((day) => [day.day, day.total.kcal, day.mealCount])).toEqual([
      ["2026-10-26", 0, 0],
      ["2026-10-27", 500, 1],
      ["2026-10-28", 0, 0],
    ]);
  });

  it("groups by the user's local day, not the UTC day", () => {
    const totals = dailyTotals([meal("2026-10-28T02:00:00Z", 300)], DAYS, ZONE);
    expect(totals[1].total.kcal).toBe(300);
    expect(totals[2].total.kcal).toBe(0);
  });

  it("ignores meals outside the requested days", () => {
    const totals = dailyTotals([meal("2026-01-01T12:00:00Z", 900)], DAYS, ZONE);
    expect(totals.every((day) => day.mealCount === 0)).toBe(true);
  });
});

describe("summarize", () => {
  const totals = dailyTotals(
    [meal("2026-10-26T16:00:00Z", 1000), meal("2026-10-27T16:00:00Z", 3000)],
    DAYS,
    ZONE,
  );

  it("averages over logged days only", () => {
    const summary = summarize(totals, 2000);
    expect(summary.loggedDays).toBe(2);
    expect(summary.averageKcal).toBe(2000);
  });

  it("counts days at or under the goal as on target", () => {
    expect(summarize(totals, 1000).daysOnTarget).toBe(1);
    expect(summarize(totals, 999).daysOnTarget).toBe(0);
  });

  it("has no average when nothing is logged", () => {
    expect(summarize(dailyTotals([], DAYS, ZONE), 2000)).toEqual({
      loggedDays: 0,
      averageKcal: null,
      daysOnTarget: 0,
    });
  });
});
