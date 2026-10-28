import { z } from "zod";

const email = z.email("Enter a valid email address.").trim().toLowerCase();

export const logInSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password."),
});

export const signUpSchema = z.object({
  email,
  // Supabase rejects passwords over 72 bytes (bcrypt limit).
  password: z.string().min(8, "Use at least 8 characters.").max(72, "Use 72 characters or fewer."),
});

export type AuthFields = keyof z.infer<typeof logInSchema>;
