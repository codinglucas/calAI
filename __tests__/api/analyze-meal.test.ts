// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/analyze-meal/route";
import { analyzeMeal } from "@/lib/ai/analyzeMeal";
import { getCurrentUser } from "@/lib/auth";

vi.mock("@/lib/auth", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/lib/ai/analyzeMeal", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/ai/analyzeMeal")>()),
  analyzeMeal: vi.fn(),
}));
vi.mock("@/lib/ai/providers/gemini", () => ({ geminiVision: vi.fn() }));
vi.mock("@/lib/ai/providers/anthropic", () => ({ anthropicVision: vi.fn() }));

const analyze = vi.mocked(analyzeMeal);
const currentUser = vi.mocked(getCurrentUser);

function post(fields: Record<string, string | File> = {}) {
  const body = new FormData();
  for (const [name, value] of Object.entries(fields)) body.append(name, value);
  return POST(new Request("http://localhost/api/analyze-meal", { method: "POST", body }));
}

const photo = (type = "image/jpeg", size = 10) =>
  new File([new Uint8Array(size)], "meal.jpg", { type });

beforeEach(() => {
  analyze.mockReset();
  currentUser.mockReset();
  currentUser.mockResolvedValue({ id: "user-1", email: "a@example.com" });
  analyze.mockResolvedValue({ ok: true, analysis: { items: [], notes: "" } });
});

describe("POST /api/analyze-meal", () => {
  it("rejects signed-out requests before any AI call", async () => {
    currentUser.mockResolvedValue(null);
    const response = await post({ photo: photo() });
    expect(response.status).toBe(401);
    expect(analyze).not.toHaveBeenCalled();
  });

  it("needs a photo", async () => {
    expect((await post()).status).toBe(400);
    expect((await post({ photo: photo("image/jpeg", 0) })).status).toBe(400);
    expect(analyze).not.toHaveBeenCalled();
  });

  it("rejects other file types", async () => {
    expect((await post({ photo: photo("application/pdf") })).status).toBe(415);
    expect(analyze).not.toHaveBeenCalled();
  });

  it("rejects photos over 5 MB", async () => {
    const response = await post({ photo: photo("image/jpeg", 5 * 1024 * 1024 + 1) });
    expect(response.status).toBe(413);
    expect(analyze).not.toHaveBeenCalled();
  });

  it("analyzes a valid photo as a meal by default", async () => {
    const response = await post({ photo: photo() });
    expect(response.status).toBe(200);
    expect(analyze.mock.calls[0][1]).toBe("meal");
    expect(analyze.mock.calls[0][0].mediaType).toBe("image/jpeg");
  });

  it("uses label mode only when asked, and treats anything else as a meal", async () => {
    await post({ photo: photo(), mode: "label" });
    await post({ photo: photo(), mode: "whatever" });
    expect(analyze.mock.calls.map((call) => call[1])).toEqual(["label", "meal"]);
  });

  it("returns a friendly message when analysis fails", async () => {
    analyze.mockResolvedValue({ ok: false, reason: "unavailable" });
    const response = await post({ photo: photo() });
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      ok: false,
      error: "Photo analysis isn't available right now. Enter the meal manually or try later.",
    });
  });
});
