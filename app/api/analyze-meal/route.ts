import {
  ANALYZABLE_IMAGE_TYPES,
  type AnalyzableImageType,
  analyzeMeal,
  type MealAnalysis,
  MAX_IMAGE_BYTES,
} from "@/lib/ai/analyzeMeal";
import { getCurrentUser } from "@/lib/auth";

// A vision call usually takes a few seconds; leave room for the retry.
export const maxDuration = 60;

export type AnalyzeMealResponse =
  { ok: true; analysis: MealAnalysis } | { ok: false; error: string };

const json = (body: AnalyzeMealResponse, status = 200) => Response.json(body, { status });

const errorMessages = {
  invalid_output: "We couldn't read the estimate for this photo. Try again or enter it manually.",
  refused: "We can't estimate this photo. Try another one or enter the meal manually.",
  unavailable: "Photo analysis isn't available right now. Enter the meal manually or try later.",
} as const;

/**
 * POST multipart/form-data with a `photo` file. The photo is read into memory,
 * sent to Claude, and dropped when the request ends: it is never written to
 * disk, the database or storage, and never logged.
 */
export async function POST(request: Request) {
  // proxy.ts doesn't redirect /api/*, so the route checks the session itself.
  const user = await getCurrentUser();
  if (!user) {
    return json({ ok: false, error: "Log in to analyze photos." }, 401);
  }

  const formData = await request.formData().catch(() => null);
  const photo = formData?.get("photo");
  if (!(photo instanceof File) || photo.size === 0) {
    return json({ ok: false, error: "Choose a photo first." }, 400);
  }
  if (!ANALYZABLE_IMAGE_TYPES.includes(photo.type as AnalyzableImageType)) {
    return json({ ok: false, error: "Use a JPEG, PNG or WebP photo." }, 415);
  }
  if (photo.size > MAX_IMAGE_BYTES) {
    return json({ ok: false, error: "That photo is too large. Try a smaller one." }, 413);
  }

  const result = await analyzeMeal({
    data: Buffer.from(await photo.arrayBuffer()),
    mediaType: photo.type as AnalyzableImageType,
  });

  if (!result.ok) {
    return json({ ok: false, error: errorMessages[result.reason] }, 502);
  }
  return json({ ok: true, analysis: result.analysis });
}
