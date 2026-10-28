import { z } from "zod";
import { ProviderUnavailableError, type VisionProvider } from "./types";

// Gemini Interactions API over plain fetch, so no extra SDK is needed.
// Docs: https://ai.google.dev/gemini-api/docs/interactions

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/interactions";
const DEFAULT_MODEL = "gemini-3.5-flash-lite";
const TIMEOUT_MS = 45_000;

// Error codes the API uses when it blocks a request or its output.
const BLOCKED_CODES = new Set([
  "safety",
  "jailbreak",
  "prohibited_content",
  "blocklist",
  "content_blocked",
  "recitation",
  "spii",
]);

type InteractionResponse = {
  status?: string;
  steps?: { type?: string; content?: { type?: string; text?: string }[] }[];
};

type ErrorResponse = { error?: { code?: string; message?: string } };

/** Gemini vision with JSON-schema output. Reads GEMINI_API_KEY and GEMINI_MODEL. */
export const geminiVision: VisionProvider = async ({ image, systemPrompt, userText, schema }) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new ProviderUnavailableError("GEMINI_API_KEY is not set.");
  }

  // Drop the $schema marker; the API only needs the schema itself.
  const { $schema: _dialect, ...jsonSchema } = z.toJSONSchema(schema);

  let response: Response;
  try {
    response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.GEMINI_MODEL || DEFAULT_MODEL,
        // Interactions are stored server-side by default; the photo must not be.
        store: false,
        system_instruction: systemPrompt,
        input: [
          { type: "text", text: userText },
          { type: "image", data: image.data.toString("base64"), mime_type: image.mediaType },
        ],
        response_format: {
          type: "text",
          mime_type: "application/json",
          schema: jsonSchema,
        },
        // Low thinking keeps the wait short, like medium effort on Claude.
        generation_config: { thinking_level: "low" },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    throw new ProviderUnavailableError(
      `Gemini request failed: ${error instanceof Error ? error.name : "unknown error"}`,
    );
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ErrorResponse;
    const code = body.error?.code ?? "unknown";
    if (BLOCKED_CODES.has(code)) {
      return { status: "refused" };
    }
    throw new ProviderUnavailableError(`Gemini API error ${response.status} (${code})`);
  }

  const interaction = (await response.json().catch(() => null)) as InteractionResponse | null;
  if (interaction?.status !== "completed") {
    // "incomplete" (cut off) or "failed": nothing usable to parse.
    return { status: "invalid" };
  }

  const text = (interaction.steps ?? [])
    .filter((step) => step.type === "model_output")
    .flatMap((step) => step.content ?? [])
    .filter((part) => part.type === "text")
    .map((part) => part.text ?? "")
    .join("");

  try {
    return { status: "ok", output: JSON.parse(text) };
  } catch {
    return { status: "invalid" };
  }
};
