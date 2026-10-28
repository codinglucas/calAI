import { headers } from "next/headers";

/**
 * The origin the current request came in on (e.g. https://calai.vercel.app),
 * used to build auth redirect URLs. Supabase only redirects to URLs on its
 * allow-list, so a spoofed Host header can't send users elsewhere.
 */
export async function getRequestOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const protocol = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${protocol}://${host}`;
}
