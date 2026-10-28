import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { ProviderUnavailableError, type VisionProvider } from "./types";

const DEFAULT_MODEL = "claude-sonnet-5-5";

let client: Anthropic | undefined;
const getClient = () => (client ??= new Anthropic());

/** Claude vision with structured output. Reads ANTHROPIC_API_KEY and ANTHROPIC_MODEL. */
export const anthropicVision: VisionProvider = async ({
  image,
  systemPrompt,
  userText,
  schema,
}) => {
  try {
    const response = await getClient().beta.messages.parse({
      model: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
      max_tokens: 16_000,
      // Medium effort keeps the wait short; portion estimates don't gain much
      // from deeper reasoning.
      output_config: { effort: "medium", format: zodOutputFormat(schema) },
      // If the model declines, the API retries on another model in the same call.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: image.mediaType,
                data: image.data.toString("base64"),
              },
            },
            { type: "text", text: userText },
          ],
        },
      ],
    });

    if (response.stop_reason === "refusal") {
      return { status: "refused" };
    }
    return { status: "ok", output: response.parsed_output };
  } catch (error) {
    // The SDK already retried rate limits, 5xx and network errors.
    if (error instanceof Anthropic.APIError) {
      throw new ProviderUnavailableError(`Claude API error ${error.status}: ${error.message}`);
    }
    // Anything else is the SDK failing to parse the reply.
    return { status: "invalid" };
  }
};
