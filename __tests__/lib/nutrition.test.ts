import { describe, expect, it } from "vitest";
import {
  kcalFromMacros,
  MACROS,
  mealTypeForHour,
  scaleToGrams,
  SUGGESTED_MACRO_SPLIT,
  suggestMacros,
  sumNutrients,
} from "@/lib/nutrition";

describe("sumNutrients", () => {
  it("adds items and rounds the result", () => {
    expect(
      sumNutrients([
        { kcal: 100, protein_g: 10.4, carbs_g: 5, fat_g: 1 },
        { kcal: 50, protein_g: 0.4, carbs_g: 5, fat_g: 1 },
      ]),
    ).toEqual({ kcal: 150, protein_g: 11, carbs_g: 10, fat_g: 2 });
  });

  it("counts blank, negative and non-numeric form fields as zero", () => {
    expect(sumNutrients([{ kcal: "", protein_g: "-5", carbs_g: "abc", fat_g: "2" }])).toEqual({
      kcal: 0,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 2,
    });
  });
});

describe("scaleToGrams", () => {
  const serving = { name: "Granola", grams: 55, kcal: 240, protein_g: 6, carbs_g: 34, fat_g: 9 };

  it("scales every nutrient by the same factor", () => {
    expect(scaleToGrams(serving, 27.5)).toEqual({
      name: "Granola",
      grams: 27.5,
      kcal: 120,
      protein_g: 3,
      carbs_g: 17,
      fat_g: 4.5,
    });
  });

  it("doesn't change the original item", () => {
    scaleToGrams(serving, 110);
    expect(serving.kcal).toBe(240);
  });
});

describe("macro goal kinds", () => {
  it("treats protein as a minimum and carbs and fat as limits", () => {
    expect(Object.fromEntries(MACROS.map((m) => [m.key, m.goalKind]))).toEqual({
      protein_g: "minimum",
      carbs_g: "limit",
      fat_g: "limit",
    });
  });
});

describe("kcalFromMacros", () => {
  it("uses 4 kcal/g for protein and carbs and 9 for fat", () => {
    expect(kcalFromMacros({ protein_g: 10, carbs_g: 10, fat_g: 10 })).toBe(170);
  });
});

describe("suggestMacros", () => {
  it("splits 2,000 kcal into 30% protein, 45% carbs and 25% fat", () => {
    expect(suggestMacros(2000)).toEqual({ protein_g: 150, carbs_g: 225, fat_g: 56 });
  });

  it("uses shares that add up to 100%", () => {
    const { protein_g, carbs_g, fat_g } = SUGGESTED_MACRO_SPLIT;
    expect(protein_g + carbs_g + fat_g).toBeCloseTo(1);
  });

  it("stays close to the goal and within limits for every allowed goal", () => {
    for (let kcal = 500; kcal <= 10_000; kcal += 1) {
      const macros = suggestMacros(kcal);
      expect(Math.abs(kcalFromMacros(macros) - kcal)).toBeLessThan(10);
      for (const grams of Object.values(macros)) {
        expect(Number.isInteger(grams) && grams >= 1 && grams <= 2000).toBe(true);
      }
    }
  });
});

describe("mealTypeForHour", () => {
  it.each([
    [3, "snack"],
    [4, "breakfast"],
    [10, "breakfast"],
    [11, "lunch"],
    [14, "lunch"],
    [15, "snack"],
    [17, "dinner"],
    [21, "dinner"],
    [22, "snack"],
  ])("hour %i is %s", (hour, type) => {
    expect(mealTypeForHour(hour)).toBe(type);
  });
});
