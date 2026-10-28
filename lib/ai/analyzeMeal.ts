import { z } from "zod";
import { CONFIDENCE_LEVELS } from "@/lib/validation/meal";
import { anthropicVision } from "./providers/anthropic";
import { geminiVision } from "./providers/gemini";
import { type ImageInput, ProviderUnavailableError, type VisionProvider } from "./providers/types";

// Server-only: providers read API keys from the environment. Import it from
// route handlers or server actions, never from a client component.

export const ANALYZABLE_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type AnalyzableImageType = ImageInput["mediaType"];

// AI_PROVIDER picks the vision model behind the same prompt and schema.
const providers: Record<string, VisionProvider> = {
  anthropic: anthropicVision,
  gemini: geminiVision,
};

/** Claude's per-image limit is 5 MB; the browser sends ~1024px JPEGs well under it. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const SYSTEM_PROMPT = `You are a nutrition assistant inside a calorie-tracking app. The user sends one photo of food they are about to eat or have eaten.

Identify each distinct food or drink you can see and estimate, for the portion visible:
- name: short and specific ("grilled chicken breast", "white rice", "latte with whole milk").
- grams: estimated edible weight in grams (for drinks, use millilitres as grams).
- kcal, protein_g, carbs_g, fat_g: for that weight, using typical values for the food as prepared.
- confidence: "high" when the food and portion are clear, "medium" when either is uncertain, "low" when you are mostly guessing (hidden ingredients, sauces, unclear scale).

Use plates, cutlery, hands and packaging to judge scale. Count cooking oil, dressings and sauces you can see, either as their own item or inside the dish they belong to. Split mixed plates into components when that makes the estimate more accurate; keep a dish whole when its parts aren't separable (soup, curry, a sandwich).

Put anything the user should know in notes, in one or two short sentences: assumptions that change the total (for example "assumed regular, not diet, soda"), or what to check. Leave notes empty when there is nothing worth saying.

If the photo shows no food or drink, return an empty items list and say so in notes.`;

// The shape the model must return. Kept loose (plain numbers) because it also
// becomes the JSON schema sent to the provider; the bounds live in checkedAnalysis.
const analysisSchema = z.object({
  items: z.array(
    z.object({
      name: z.string(),
      grams: z.number(),
      kcal: z.number(),
      protein_g: z.number(),
      carbs_g: z.number(),
      fat_g: z.number(),
      confidence: z.enum(CONFIDENCE_LEVELS),
    }),
  ),
  notes: z.string(),
});

const nonNegative = (max: number) => z.number().min(0).max(max);

// What we accept after the call: the same shape, with sane bounds.
const checkedAnalysis = z.object({
  items: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(200),
        grams: nonNegative(99_999),
        kcal: nonNegative(20_000),
        protein_g: nonNegative(9_999),
        carbs_g: nonNegative(9_999),
        fat_g: nonNegative(9_999),
        confidence: z.enum(CONFIDENCE_LEVELS),
      }),
    )
    .max(50),
  notes: z.string().max(1_000),
});

export type MealAnalysis = z.infer<typeof checkedAnalysis>;
export type AnalyzedItem = MealAnalysis["items"][number];

export type AnalyzeMealResult =
  | { ok: true; analysis: MealAnalysis }
  | { ok: false; reason: "invalid_output" | "refused" | "unavailable" };

/**
 * Estimates the foods and nutrients in a meal photo. The image only ever
 * lives in memory: it is passed to the model as base64 and never stored or
 * logged. Retries once if the reply doesn't validate.
 */
export async function analyzeMeal(image: ImageInput, attempts = 2): Promise<AnalyzeMealResult> {
  const providerName = process.env.AI_PROVIDER || "anthropic";
  const provider = providers[providerName];
  if (!provider) {
    console.error(`analyzeMeal: unknown AI_PROVIDER "${providerName}"`);
    return { ok: false, reason: "unavailable" };
  }

  let reason: "invalid_output" | "refused" = "invalid_output";
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const reply = await provider({
        image,
        systemPrompt: SYSTEM_PROMPT,
        userText: "Estimate this meal.",
        schema: analysisSchema,
      });
      if (reply.status === "ok") {
        const checked = checkedAnalysis.safeParse(reply.output);
        if (checked.success) {
          return { ok: true, analysis: checked.data };
        }
        reason = "invalid_output";
      } else {
        reason = reply.status === "refused" ? "refused" : "invalid_output";
      }
      console.error(`analyzeMeal: ${providerName} attempt ${attempt} gave ${reason}`);
    } catch (error) {
      if (error instanceof ProviderUnavailableError) {
        console.error(`analyzeMeal: ${error.message}`);
        return { ok: false, reason: "unavailable" };
      }
      throw error;
    }
  }

  return { ok: false, reason };
}
