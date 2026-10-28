"use client";

import Link from "next/link";
import { useActionState } from "react";
import { type AuthFormState, logIn, signUp } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { GoogleButton } from "./GoogleButton";

const modes = {
  login: {
    action: logIn,
    submitLabel: "Log in",
    pendingLabel: "Logging in…",
    passwordAutoComplete: "current-password",
    switchPrompt: "New here?",
    switchLabel: "Create an account",
    switchHref: "/signup",
  },
  signup: {
    action: signUp,
    submitLabel: "Create account",
    pendingLabel: "Creating account…",
    passwordAutoComplete: "new-password",
    switchPrompt: "Already have an account?",
    switchLabel: "Log in",
    switchHref: "/login",
  },
} as const;

type AuthFormProps = {
  mode: keyof typeof modes;
  /** Where to go after signing in (already validated server-side on submit). */
  next?: string;
  /** Error passed in the URL, e.g. after a failed OAuth callback. */
  initialError?: string;
};

export function AuthForm({ mode, next, initialError }: AuthFormProps) {
  const config = modes[mode];
  const [state, formAction, isPending] = useActionState<AuthFormState, FormData>(config.action, {
    error: initialError,
  });

  return (
    <div className="flex flex-col gap-6">
      <GoogleButton next={next} />

      <div className="text-muted flex items-center gap-3 text-sm">
        <span className="bg-border h-px flex-1" />
        or with email
        <span className="bg-border h-px flex-1" />
      </div>

      <form action={formAction} className="flex flex-col gap-4" noValidate>
        {next && <input type="hidden" name="next" value={next} />}
        <TextField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          defaultValue={state.email}
          error={state.fieldErrors?.email}
        />
        <TextField
          label="Password"
          name="password"
          type="password"
          autoComplete={config.passwordAutoComplete}
          required
          minLength={mode === "signup" ? 8 : undefined}
          error={state.fieldErrors?.password}
        />

        {state.error && (
          <p role="alert" className="text-danger text-sm">
            {state.error}
          </p>
        )}
        {state.message && (
          <p role="status" className="text-accent text-sm">
            {state.message}
          </p>
        )}

        <Button type="submit" disabled={isPending}>
          {isPending ? config.pendingLabel : config.submitLabel}
        </Button>
      </form>

      <p className="text-muted text-center text-sm">
        {config.switchPrompt}{" "}
        <Link href={config.switchHref} className="text-foreground font-medium underline">
          {config.switchLabel}
        </Link>
      </p>
    </div>
  );
}
