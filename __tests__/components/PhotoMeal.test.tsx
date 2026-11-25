import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PhotoMeal } from "@/components/meals/PhotoMeal";
import { resizeToJpeg } from "@/lib/image/resizeImage";

vi.mock("@/lib/image/resizeImage", () => ({ resizeToJpeg: vi.fn() }));

const resize = vi.mocked(resizeToJpeg);
const fetchMock = vi.fn();

const granola = {
  name: "Granola",
  grams: 55,
  kcal: 240,
  protein_g: 6,
  carbs_g: 34,
  fat_g: 9,
  confidence: "high",
};
const analysis = (items: unknown[], notes = "") =>
  new Response(JSON.stringify({ ok: true, analysis: { items, notes } }));

function setup() {
  return render(
    <PhotoMeal
      action={vi.fn(async () => ({}))}
      defaults={{ mealType: "lunch", eatenAtLocal: "2026-10-27T12:00" }}
    />,
  );
}

const switchTo = (name: string) => fireEvent.click(screen.getByRole("button", { name }));

function choosePhoto(container: HTMLElement) {
  const input = container.querySelector('input[type="file"]') as HTMLInputElement;
  fireEvent.change(input, {
    target: { files: [new File(["x"], "photo.jpg", { type: "image/jpeg" })] },
  });
}

const value = (label: string) => (screen.getByLabelText(label) as HTMLInputElement).value;

beforeEach(() => {
  resize.mockReset();
  resize.mockResolvedValue(new Blob(["jpeg"], { type: "image/jpeg" }));
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  URL.createObjectURL = vi.fn(() => "blob:preview");
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("meal mode", () => {
  it("resizes normally, sends the mode and goes straight to confirm", async () => {
    fetchMock.mockResolvedValue(analysis([granola]));
    const { container } = setup();
    choosePhoto(container);

    expect(await screen.findByRole("button", { name: "Log meal" })).toBeDefined();
    expect(resize.mock.calls[0][1]).toBeUndefined();
    expect((fetchMock.mock.calls[0][1].body as FormData).get("mode")).toBe("meal");
    expect(screen.queryByLabelText(/How much did you have/)).toBeNull();
  });

  it("explains when no food is found", async () => {
    fetchMock.mockResolvedValue(analysis([], "That looks like a wall."));
    const { container } = setup();
    choosePhoto(container);
    expect(await screen.findByText("That looks like a wall.")).toBeDefined();
  });
});

describe("label mode", () => {
  async function readLabel(notes = "") {
    fetchMock.mockResolvedValue(analysis([granola], notes));
    const view = setup();
    switchTo("Nutrition label");
    choosePhoto(view.container);
    await screen.findByLabelText(/How much did you have/);
    return view;
  }
  const amount = /How much did you have/;
  const amountValue = () => (screen.getByLabelText(amount) as HTMLInputElement).value;

  it("keeps more detail in the photo and sends the mode", async () => {
    await readLabel();
    expect(resize.mock.calls[0][1]).toBe(1600);
    expect((fetchMock.mock.calls[0][1].body as FormData).get("mode")).toBe("label");
  });

  it("starts at one serving and shows the label's values", async () => {
    await readLabel();
    expect(amountValue()).toBe("55");
    expect(screen.getByText(/240 kcal per 55 g on the label/)).toBeDefined();
  });

  it("updates the preview as the amount changes", async () => {
    await readLabel();
    fireEvent.change(screen.getByLabelText(amount), { target: { value: "110" } });
    expect(screen.getByText(/480 kcal · 12 g protein · 68 g carbs · 18 g fat/)).toBeDefined();
  });

  it.each([
    ["½", "27.5", "120 kcal"],
    ["1", "55", "240 kcal"],
    ["2", "110", "480 kcal"],
  ])("serving shortcut %s fills in %s g", async (label, grams, kcal) => {
    await readLabel();
    fireEvent.click(screen.getByRole("button", { name: label }));
    expect(amountValue()).toBe(grams);
    expect(screen.getByText(new RegExp(`^${kcal} ·`))).toBeDefined();
    expect(screen.getByRole("button", { name: label }).getAttribute("aria-pressed")).toBe("true");
  });

  it("passes scaled values to the confirm form", async () => {
    await readLabel();
    fireEvent.click(screen.getByRole("button", { name: "2" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(await screen.findByRole("button", { name: "Log meal" })).toBeDefined();
    expect(value("Grams")).toBe("110");
    expect(value("kcal")).toBe("480");
    expect(value("Protein")).toBe("12");
    expect(value("Carbs")).toBe("68");
    expect(value("Fat")).toBe("18");
  });

  it.each(["0", "-5", "100000", ""])("won't continue with an amount of %j", async (bad) => {
    await readLabel();
    fireEvent.change(screen.getByLabelText(amount), { target: { value: bad } });
    expect(screen.getByRole("button", { name: "Continue" }).hasAttribute("disabled")).toBe(true);
  });

  it("explains when no label is found", async () => {
    fetchMock.mockResolvedValue(analysis([]));
    const { container } = setup();
    switchTo("Nutrition label");
    choosePhoto(container);
    expect(
      await screen.findByText("We couldn't read a nutrition label in that photo."),
    ).toBeDefined();
  });

  it("clears the result when switching back to meal mode", async () => {
    await readLabel();
    switchTo("Meal");
    expect(screen.queryByLabelText(amount)).toBeNull();
    expect(screen.queryByRole("img")).toBeNull();
  });
});

describe("failures", () => {
  it("shows the server's message", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: false, error: "Log in to analyze photos." }), {
        status: 401,
      }),
    );
    const { container } = setup();
    choosePhoto(container);
    expect(await screen.findByText("Log in to analyze photos.")).toBeDefined();
  });

  it("explains a network failure", async () => {
    fetchMock.mockRejectedValue(new TypeError("offline"));
    const { container } = setup();
    choosePhoto(container);
    expect(
      await screen.findByText("Couldn't reach the server. Check your connection."),
    ).toBeDefined();
  });

  it("explains a photo it can't open, without uploading", async () => {
    resize.mockRejectedValue(new Error("bad image"));
    const { container } = setup();
    choosePhoto(container);
    expect(
      await screen.findByText("We couldn't open that photo. Try a JPEG or PNG."),
    ).toBeDefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
