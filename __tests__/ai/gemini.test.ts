// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { geminiVision } from "@/lib/ai/providers/gemini";
import { ProviderUnavailableError } from "@/lib/ai/providers/types";

const request = {
  image: { data: Buffer.from("photo"), mediaType: "image/jpeg" as const },
  systemPrompt: "system",
  userText: "user",
  schema: z.object({ items: z.array(z.string()) }),
};

const fetchMock = vi.fn();
const respond = (status: number, body: unknown) =>
  fetchMock.mockResolvedValue(new Response(JSON.stringify(body), { status }));
const completed = (text: string) => ({
  status: "completed",
  steps: [
    { type: "thought", content: [{ type: "text", text: "ignore me" }] },
    { type: "model_output", content: [{ type: "text", text }] },
  ],
});

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("geminiVision", () => {
  it("asks Google not to store the photo and sends the key in a header", async () => {
    respond(200, completed('{"items":[]}'));
    await geminiVision(request);
    const [url, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init.body);
    expect(body.store).toBe(false);
    expect(init.headers["x-goog-api-key"]).toBe("test-key");
    expect(url).not.toContain("test-key");
  });

  it("sends the photo as base64", async () => {
    respond(200, completed('{"items":[]}'));
    await geminiVision(request);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.input[1]).toEqual({
      type: "image",
      data: Buffer.from("photo").toString("base64"),
      mime_type: "image/jpeg",
    });
  });

  it("parses only the model's output", async () => {
    respond(200, completed('{"items":["rice"]}'));
    await expect(geminiVision(request)).resolves.toEqual({
      status: "ok",
      output: { items: ["rice"] },
    });
  });

  it("treats an unfinished reply or broken JSON as invalid", async () => {
    respond(200, { status: "incomplete" });
    await expect(geminiVision(request)).resolves.toEqual({ status: "invalid" });
    respond(200, completed("not json"));
    await expect(geminiVision(request)).resolves.toEqual({ status: "invalid" });
  });

  it("treats a blocked request as a refusal", async () => {
    respond(400, { error: { code: "safety" } });
    await expect(geminiVision(request)).resolves.toEqual({ status: "refused" });
  });

  it("treats quota errors and network failures as unavailable", async () => {
    respond(429, { error: { code: "too_many_requests" } });
    await expect(geminiVision(request)).rejects.toBeInstanceOf(ProviderUnavailableError);
    fetchMock.mockRejectedValue(new TypeError("network"));
    await expect(geminiVision(request)).rejects.toBeInstanceOf(ProviderUnavailableError);
  });

  it("is unavailable without an API key and makes no request", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    await expect(geminiVision(request)).rejects.toBeInstanceOf(ProviderUnavailableError);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
