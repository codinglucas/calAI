import { describe, expect, it } from "vitest";
import { issuesByPath, mealInputSchema, mealItemSchema } from "@/lib/validation/meal";
import { settingsSchema } from "@/lib/validation/profile";

describe("settingsSchema", () => {
  const valid = {
    daily_calorie_goal: "2000",
    timezone: "America/New_York",
    protein_goal_g: "150",
    carbs_goal_g: "",
    fat_goal_g: "",
  };

  it.each([[""], ["   "], [null]])("treats a macro goal of %j as no goal, not zero", (value) => {
    expect(settingsSchema.parse({ ...valid, protein_goal_g: value }).protein_goal_g).toBeNull();
  });

  it("parses a macro goal to a number and keeps other blanks as no goal", () => {
    const parsed = settingsSchema.parse(valid);
    expect(parsed.protein_goal_g).toBe(150);
    expect(parsed.carbs_goal_g).toBeNull();
  });

  it.each([
    ["0", "at least 1"],
    ["-5", "at least 1"],
    ["1.5", "whole number"],
    ["abc", "number"],
    ["2001", "at most 2,000"],
  ])("rejects a macro goal of %s", (value, message) => {
    const result = settingsSchema.safeParse({ ...valid, protein_goal_g: value });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toContain(message);
  });

  it.each(["499", "10001", ""])("rejects a calorie goal of %j", (value) => {
    expect(settingsSchema.safeParse({ ...valid, daily_calorie_goal: value }).success).toBe(false);
  });

  it("rejects an unknown time zone", () => {
    expect(settingsSchema.safeParse({ ...valid, timezone: "Mars/Olympus" }).success).toBe(false);
  });
});

describe("mealItemSchema", () => {
  const item = {
    name: "Rice",
    grams: "100",
    kcal: "130.6",
    protein_g: "2.74",
    carbs_g: "",
    fat_g: "0",
  };

  it("trims the name, rounds values and counts blanks as zero", () => {
    expect(mealItemSchema.parse({ ...item, name: "  Rice  " })).toEqual({
      name: "Rice",
      grams: 100,
      kcal: 131,
      protein_g: 2.7,
      carbs_g: 0,
      fat_g: 0,
      source: "manual",
      confidence: null,
    });
  });

  it("rejects an empty name and negative amounts", () => {
    expect(mealItemSchema.safeParse({ ...item, name: "   " }).success).toBe(false);
    expect(mealItemSchema.safeParse({ ...item, kcal: "-1" }).success).toBe(false);
  });

  it("rejects an unknown source", () => {
    expect(mealItemSchema.safeParse({ ...item, source: "guess" }).success).toBe(false);
  });
});

describe("mealInputSchema", () => {
  const meal = {
    meal_type: "lunch",
    eaten_at_local: "2026-10-27T12:30",
    items: [{ name: "Rice", grams: 100, kcal: 130, protein_g: 3, carbs_g: 28, fat_g: 0 }],
  };

  it("accepts a valid meal", () => {
    expect(mealInputSchema.safeParse(meal).success).toBe(true);
  });

  it("needs at least one item, a known type and a valid time", () => {
    expect(mealInputSchema.safeParse({ ...meal, items: [] }).success).toBe(false);
    expect(mealInputSchema.safeParse({ ...meal, meal_type: "brunch" }).success).toBe(false);
    expect(mealInputSchema.safeParse({ ...meal, eaten_at_local: "yesterday" }).success).toBe(false);
  });

  it("reports errors by field path", () => {
    const { error } = mealInputSchema.safeParse({
      ...meal,
      items: [{ ...meal.items[0], name: "" }],
    });
    expect(issuesByPath(error!)).toEqual({ "items.0.name": "Name the food." });
  });
});
