import { z } from "zod";

// NEXT_PUBLIC_* values are inlined into the browser bundle at build time, so
// each one must be referenced by its full name (no dynamic process.env access).
const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

const parsed = publicEnvSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});

if (!parsed.success) {
  throw new Error(
    `Missing or invalid environment variables:\n${z.prettifyError(parsed.error)}\n` +
      "Copy .env.example to .env.local and fill in your Supabase project values.",
  );
}

export const publicEnv = {
  supabaseUrl: parsed.data.NEXT_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: parsed.data.NEXT_PUBLIC_SUPABASE_ANON_KEY,
};
