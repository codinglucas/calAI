"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { DEFAULT_SIGNED_IN_PATH, safeNextPath } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";
import { getRequestOrigin } from "@/lib/url";
import { type AuthFields, logInSchema, signUpSchema } from "@/lib/validation/auth";

export type AuthFormState = {
  /** Echoed back so the email field survives a failed submit. */
  email?: string;
  fieldErrors?: Partial<Record<AuthFields, string>>;
  error?: string;
  /** Non-error outcome, e.g. "check your inbox". */
  message?: string;
};

function readCredentials(formData: FormData) {
  return {
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  };
}

function firstFieldErrors(error: z.ZodError<Record<AuthFields, string>>) {
  const { fieldErrors } = z.flattenError(error);
  return {
    email: fieldErrors.email?.[0],
    password: fieldErrors.password?.[0],
  };
}

export async function logIn(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const input = readCredentials(formData);
  const parsed = logInSchema.safeParse(input);
  if (!parsed.success) {
    return { email: input.email, fieldErrors: firstFieldErrors(parsed.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return {
      email: input.email,
      error:
        error.code === "email_not_confirmed"
          ? "Confirm your email first. Check your inbox for the link."
          : "Wrong email or password.",
    };
  }

  redirect(safeNextPath(formData.get("next")));
}

export async function signUp(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const input = readCredentials(formData);
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) {
    return { email: input.email, fieldErrors: firstFieldErrors(parsed.error) };
  }

  const supabase = await createClient();
  const origin = await getRequestOrigin();
  const { data, error } = await supabase.auth.signUp({
    ...parsed.data,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  });
  if (error) {
    return { email: input.email, error: error.message };
  }

  // With email confirmation turned off, Supabase signs the user in right away.
  if (data.session) {
    redirect(DEFAULT_SIGNED_IN_PATH);
  }
  return {
    email: input.email,
    message: "Check your inbox for a confirmation link to finish signing up.",
  };
}

export async function signInWithGoogle(formData: FormData) {
  const next = safeNextPath(formData.get("next"));
  const supabase = await createClient();
  const origin = await getRequestOrigin();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error || !data.url) {
    redirect("/login?error=oauth");
  }
  redirect(data.url);
}

export async function logOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
