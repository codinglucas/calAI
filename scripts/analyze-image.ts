// Runs the app's own analyzeMeal on one image file and prints the result as
// JSON, so the accuracy eval (eval/run.py) measures exactly what the app does:
// same prompts, schema, bounds and retry. Reads keys from .env.local.
//
// node --env-file-if-exists=.env.local --import ./scripts/register-ts.mjs \
//   scripts/analyze-image.ts <image> [meal|label]
import { readFile, stat } from "node:fs/promises";
import { extname } from "node:path";
import {
  type AnalysisMode,
  type AnalyzableImageType,
  analyzeMeal,
  MAX_IMAGE_BYTES,
} from "@/lib/ai/analyzeMeal";

const MEDIA_TYPES: Record<string, AnalyzableImageType> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

const [path, modeArg = "meal"] = process.argv.slice(2);
const mediaType = path ? MEDIA_TYPES[extname(path).toLowerCase()] : undefined;
if (!path || !mediaType || (modeArg !== "meal" && modeArg !== "label")) {
  console.error("Usage: analyze-image.ts <image.jpg|png|webp> [meal|label]");
  process.exit(2);
}
if ((await stat(path)).size > MAX_IMAGE_BYTES) {
  console.error("Image is over the app's 5 MB limit.");
  process.exit(2);
}

const mode: AnalysisMode = modeArg;
const provider = process.env.AI_PROVIDER || "anthropic";
const model =
  (provider === "gemini" ? process.env.GEMINI_MODEL : process.env.ANTHROPIC_MODEL) || "default";

const started = performance.now();
const result = await analyzeMeal({ data: await readFile(path), mediaType }, mode);
const ms = Math.round(performance.now() - started);

console.log(JSON.stringify({ provider, model, mode, ms, ...result }));
