import { describe, expect, it } from "vitest";
import { itemValuesFromAnalysis, newMealDefaults } from "@/components/meals/formValues";

describe("itemValuesFromAnalysis", () => {
  it("rounds for the form and marks items as coming from the AI", () => {
    const [item] = itemValuesFromAnalysis([
      {
        name: "Rice",
        grams: 151.6,
        kcal: 196.4,
        protein_g: 4.06,
        carbs_g: 43.14,
        fat_g: 0.44,
        confidence: "medium",
      },
    ]);
    expect(item).toEqual({
      name: "Rice",
      grams: "152",
      kcal: "196",
      protein_g: "4.1",
      carbs_g: "43.1",
      fat_g: "0.4",
      source: "ai",
      confidence: "medium",
    });
  });
});

describe("newMealDefaults", () => {
  const noonInNewYork = new Date("2026-10-27T16:00:00Z");

  it("guesses the meal type from the local hour and uses the local time", () => {
    expect(newMealDefaults(undefined, "America/New_York", noonInNewYork)).toEqual({
      mealType: "lunch",
      eatenAtLocal: "2026-10-27T12:00",
    });
  });

  it("prefers a valid requested type and ignores an invalid one", () => {
    expect(newMealDefaults("snack", "America/New_York", noonInNewYork).mealType).toBe("snack");
    expect(newMealDefaults("brunch", "America/New_York", noonInNewYork).mealType).toBe("lunch");
  });
});
