import type { z } from "zod";

export type ImageInput = {
  data: Buffer;
  mediaType: "image/jpeg" | "image/png" | "image/webp";
};

export type VisionRequest = {
  image: ImageInput;
  systemPrompt: string;
  userText: string;
  /** Shape the reply must follow; sent to the provider as its JSON output format. */
  schema: z.ZodType;
};

/**
 * What a provider returns. `output` is the parsed JSON, not yet validated:
 * analyzeMeal checks it against its own schema.
 */
export type VisionReply =
  { status: "ok"; output: unknown } | { status: "refused" } | { status: "invalid" };

/** The provider couldn't be reached or rejected the call (auth, quota, outage). */
export class ProviderUnavailableError extends Error {}

export type VisionProvider = (request: VisionRequest) => Promise<VisionReply>;
