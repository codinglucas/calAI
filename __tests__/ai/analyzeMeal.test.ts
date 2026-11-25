// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { analyzeMeal } from "@/lib/ai/analyzeMeal";
import { geminiVision } from "@/lib/ai/providers/gemini";
import { ProviderUnavailableError } from "@/lib/ai/providers/types";

vi.mock("@/lib/ai/providers/gemini", () => ({ geminiVision: vi.fn() }));
vi.mock("@/lib/ai/providers/anthropic", () => ({ anthropicVision: vi.fn() }));

const provider = vi.mocked(geminiVision);
const image = { data: Buffer.from("secret-photo-bytes"), mediaType: "image/jpeg" as const };

const item = {
  name: "Rice",
  grams: 100,
  kcal: 130,
  protein_g: 3,
  carbs_g: 28,
  fat_g: 0,
  confidence: "high",
};
const reply = (items: unknown[], notes = "") => ({
  status: "ok" as const,
  output: { items, notes },
});

let errorLog: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  provider.mockReset();
  errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("analyzeMeal", () => {
  it("returns a valid analysis", async () => {
    provider.mockResolvedValue(reply([item], "Assumed white rice."));
    await expect(analyzeMeal(image)).resolves.toEqual({
      ok: true,
      analysis: { items: [item], notes: "Assumed white rice." },
    });
    expect(provider).toHaveBeenCalledTimes(1);
  });

  it("retries once when the reply doesn't validate", async () => {
    provider.mockResolvedValueOnce({ status: "invalid" }).mockResolvedValueOnce(reply([item]));
    await expect(analyzeMeal(image)).resolves.toMatchObject({ ok: true });
    expect(provider).toHaveBeenCalledTimes(2);
  });

  it("gives up after two bad replies", async () => {
    provider.mockResolvedValue({ status: "invalid" });
    await expect(analyzeMeal(image)).resolves.toEqual({ ok: false, reason: "invalid_output" });
    expect(provider).toHaveBeenCalledTimes(2);
  });

  it.each([
    ["negative calories", { ...item, kcal: -1 }],
    ["impossible calories", { ...item, kcal: 20_001 }],
    ["an empty name", { ...item, name: "  " }],
    ["an unknown confidence", { ...item, confidence: "sure" }],
  ])("rejects a reply with %s", async (_label, badItem) => {
    provider.mockResolvedValue(reply([badItem]));
    await expect(analyzeMeal(image)).resolves.toEqual({ ok: false, reason: "invalid_output" });
  });

  it("reports a refusal", async () => {
    provider.mockResolvedValue({ status: "refused" });
    await expect(analyzeMeal(image)).resolves.toEqual({ ok: false, reason: "refused" });
  });

  it("doesn't retry when the provider is unavailable", async () => {
    provider.mockRejectedValue(new ProviderUnavailableError("quota"));
    await expect(analyzeMeal(image)).resolves.toEqual({ ok: false, reason: "unavailable" });
    expect(provider).toHaveBeenCalledTimes(1);
  });

  it("is unavailable for an unknown provider, without calling one", async () => {
    vi.stubEnv("AI_PROVIDER", "nope");
    await expect(analyzeMeal(image)).resolves.toEqual({ ok: false, reason: "unavailable" });
    expect(provider).not.toHaveBeenCalled();
  });

  it("lets unexpected errors surface", async () => {
    provider.mockRejectedValue(new Error("bug"));
    await expect(analyzeMeal(image)).rejects.toThrow("bug");
  });

  it("never logs the photo", async () => {
    provider.mockResolvedValue({ status: "invalid" });
    await analyzeMeal(image);
    const logged = JSON.stringify(errorLog.mock.calls);
    expect(logged).not.toContain("secret-photo-bytes");
    expect(logged).not.toContain(image.data.toString("base64"));
  });
});

describe("modes", () => {
  it("estimates in meal mode and copies printed numbers in label mode", async () => {
    provider.mockResolvedValue(reply([item]));
    await analyzeMeal(image);
    await analyzeMeal(image, "label");
    const [mealRequest, labelRequest] = provider.mock.calls.map(([request]) => request);
    expect(mealRequest.userText).toBe("Estimate this meal.");
    expect(labelRequest.userText).toBe("Read this nutrition label.");
    expect(labelRequest.systemPrompt).toContain("do not estimate");
  });

  it("accepts a label reply with no items, meaning no label was found", async () => {
    provider.mockResolvedValue(reply([], "No label in this photo."));
    await expect(analyzeMeal(image, "label")).resolves.toMatchObject({ ok: true });
  });

  it.each([
    ["more than one item", [item, item]],
    ["a weight of zero, which scaling would divide by", [{ ...item, grams: 0 }]],
  ])("rejects a label reply with %s", async (_label, items) => {
    provider.mockResolvedValue(reply(items));
    await expect(analyzeMeal(image, "label")).resolves.toEqual({
      ok: false,
      reason: "invalid_output",
    });
  });

  it("allows several items in meal mode", async () => {
    provider.mockResolvedValue(reply([item, item]));
    await expect(analyzeMeal(image, "meal")).resolves.toMatchObject({ ok: true });
  });
});
