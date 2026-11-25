import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { saveSettings } from "@/app/(app)/settings/actions";
import { SettingsForm } from "@/components/settings/SettingsForm";

vi.mock("@/app/(app)/settings/actions", () => ({ saveSettings: vi.fn() }));

const save = vi.mocked(saveSettings);

// The first option matters: a form reset falls back to it.
const timeZones = ["Africa/Abidjan", "America/New_York", "Asia/Tokyo"];

function renderForm() {
  return render(
    <SettingsForm
      dailyCalorieGoal={2000}
      macroGoals={{ protein_g: 120, carbs_g: null, fat_g: null }}
      timezone="America/New_York"
      timeZones={timeZones}
    />,
  );
}

const field = (label: RegExp | string) => screen.getByLabelText(label) as HTMLInputElement;
const type = (label: RegExp | string, value: string) =>
  fireEvent.change(field(label), { target: { value } });
const submit = () => fireEvent.click(screen.getByRole("button", { name: "Save settings" }));
const suggestionButton = () => screen.queryByRole("button", { name: "Use these" });

beforeEach(() => {
  save.mockReset();
  save.mockResolvedValue({ savedAt: 1 });
});

describe("saving", () => {
  // Regression: a saved form snapped to Africa/Abidjan while the database kept
  // the right zone, because React reset the form after its action ran.
  it("keeps the chosen time zone and goals on screen after saving", async () => {
    renderForm();
    fireEvent.change(field("Time zone"), { target: { value: "Asia/Tokyo" } });
    type(/calorie goal/, "1800");
    submit();

    await screen.findByText("Saved.");
    expect(field("Time zone").value).toBe("Asia/Tokyo");
    expect(field(/calorie goal/).value).toBe("1800");
    expect(field("Protein (g)").value).toBe("120");
  });

  it("sends every field to the action, with blank macros left blank", async () => {
    renderForm();
    submit();

    await waitFor(() => expect(save).toHaveBeenCalled());
    const formData = save.mock.calls[0][1];
    expect(Object.fromEntries(formData)).toEqual({
      daily_calorie_goal: "2000",
      protein_goal_g: "120",
      carbs_goal_g: "",
      fat_goal_g: "",
      timezone: "America/New_York",
    });
  });

  it("shows errors from the server next to their fields", async () => {
    save.mockResolvedValue({ fieldErrors: { carbs_goal_g: "Use a whole number." } });
    renderForm();
    submit();

    expect(await screen.findByText("Use a whole number.")).toBeDefined();
    expect(screen.queryByText("Saved.")).toBeNull();
  });
});

describe("macro hint", () => {
  it("only compares with the calorie goal once all three macros are set", () => {
    renderForm();
    expect(screen.queryByText(/add up to/)).toBeNull();
    type("Protein (g)", "150");
    type("Carbs (g)", "200");
    expect(screen.queryByText(/add up to/)).toBeNull();
    type("Fat (g)", "60");
    expect(
      screen.getByText("Your macro goals add up to 1,940 kcal, 60 under your calorie goal."),
    ).toBeDefined();
  });

  it("says over, and treats a small rounding gap as matching", () => {
    renderForm();
    type("Protein (g)", "200");
    type("Carbs (g)", "200");
    type("Fat (g)", "60");
    expect(screen.getByText(/2,140 kcal, 140 over your calorie goal/)).toBeDefined();
    type("Protein (g)", "150");
    type("Carbs (g)", "225");
    type("Fat (g)", "56");
    expect(screen.getByText(/2,004 kcal, matching your calorie goal/)).toBeDefined();
  });
});

describe("macro suggestion", () => {
  it("follows the calorie goal as it changes", () => {
    renderForm();
    expect(
      screen.getByText(/Suggested for 2,000 kcal: 150g protein, 225g carbs, 56g fat/),
    ).toBeDefined();
    type(/calorie goal/, "2500");
    expect(
      screen.getByText(/Suggested for 2,500 kcal: 188g protein, 281g carbs, 69g fat/),
    ).toBeDefined();
  });

  it("never overwrites macros on its own", () => {
    renderForm();
    type(/calorie goal/, "2500");
    expect(field("Protein (g)").value).toBe("120");
    expect(field("Carbs (g)").value).toBe("");
  });

  it("fills the fields when chosen, then hides", () => {
    renderForm();
    fireEvent.click(suggestionButton()!);
    expect(field("Protein (g)").value).toBe("150");
    expect(field("Carbs (g)").value).toBe("225");
    expect(field("Fat (g)").value).toBe("56");
    expect(suggestionButton()).toBeNull();
    expect(save).not.toHaveBeenCalled();
  });

  it("comes back after a macro is edited", () => {
    renderForm();
    fireEvent.click(suggestionButton()!);
    type("Protein (g)", "151");
    expect(suggestionButton()).not.toBeNull();
  });

  it.each(["499", "10001", ""])("hides for an out-of-range calorie goal of %j", (value) => {
    renderForm();
    type(/calorie goal/, value);
    expect(suggestionButton()).toBeNull();
  });
});
