import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth/AuthForm";
import { AuthFormSkeleton } from "@/components/auth/AuthFormSkeleton";

export const metadata: Metadata = { title: "Log in" };

const callbackErrors: Record<string, string> = {
  auth_callback: "That sign-in link is invalid or has expired. Please try again.",
  oauth: "Couldn't start Google sign-in. Please try again.",
};

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <>
      <h1 className="mb-6 text-center text-xl font-semibold">Welcome back</h1>
      {/* searchParams are request-time data, so the form streams in behind Suspense. */}
      <Suspense fallback={<AuthFormSkeleton />}>
        <LoginForm searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function LoginForm({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const { next, error } = await searchParams;
  return (
    <AuthForm
      mode="login"
      next={typeof next === "string" ? next : undefined}
      initialError={typeof error === "string" ? callbackErrors[error] : undefined}
    />
  );
}
