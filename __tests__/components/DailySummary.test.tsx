import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DailySummary } from "@/components/meals/DailySummary";

const total = { kcal: 1420, protein_g: 170, carbs_g: 240, fat_g: 40 };
const noGoals = { protein_g: null, carbs_g: null, fat_g: null };

const bar = (label: string) =>
  screen.getByRole("progressbar", { name: `${label} eaten compared with your daily goal` });
const fill = (element: HTMLElement) => element.firstElementChild as HTMLElement;

describe("DailySummary", () => {
  it("shows calories left, or how far over", () => {
    const { rerender } = render(<DailySummary total={total} goal={2000} macroGoals={noGoals} />);
    expect(screen.getByText("580 left")).toBeDefined();
    rerender(<DailySummary total={total} goal={1000} macroGoals={noGoals} />);
    expect(screen.getByText("420 over")).toBeDefined();
  });

  it("shows only grams for a macro with no goal", () => {
    render(<DailySummary total={total} goal={2000} macroGoals={noGoals} />);
    expect(screen.getByText("170g")).toBeDefined();
    expect(screen.queryByText(/^of \d+g$/)).toBeNull();
    expect(screen.queryByRole("progressbar", { name: /Protein/ })).toBeNull();
  });

  it("stays green when protein passes its goal, since it's a minimum", () => {
    render(
      <DailySummary
        total={total}
        goal={2000}
        macroGoals={{ protein_g: 150, carbs_g: null, fat_g: null }}
      />,
    );
    expect(fill(bar("Protein")).className).toContain("bg-accent");
    expect(screen.getByText("170g").className).not.toContain("text-danger");
  });

  it("turns red when carbs or fat pass their goal, since they're limits", () => {
    render(
      <DailySummary
        total={total}
        goal={2000}
        macroGoals={{ protein_g: null, carbs_g: 200, fat_g: 30 }}
      />,
    );
    expect(fill(bar("Carbs")).className).toContain("bg-danger");
    expect(fill(bar("Fat")).className).toContain("bg-danger");
    expect(screen.getByText("240g").className).toContain("text-danger");
  });

  it("stays green exactly at a limit", () => {
    render(
      <DailySummary
        total={total}
        goal={2000}
        macroGoals={{ protein_g: null, carbs_g: 240, fat_g: null }}
      />,
    );
    expect(fill(bar("Carbs")).className).toContain("bg-accent");
  });

  it("sizes bars by progress and caps them at 100%", () => {
    render(
      <DailySummary
        total={total}
        goal={2000}
        macroGoals={{ protein_g: 150, carbs_g: null, fat_g: 60 }}
      />,
    );
    expect(fill(bar("Fat")).style.width).toBe("67%");
    expect(fill(bar("Protein")).style.width).toBe("100%");
    expect(within(bar("Fat")).queryByRole("progressbar")).toBeNull();
  });
});
