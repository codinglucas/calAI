import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { publicEnv } from "@/lib/env";
import { DEFAULT_SIGNED_IN_PATH, isPublicPath } from "@/lib/routes";
import type { Database } from "@/types/database";

/**
 * Refreshes the Supabase session cookie and redirects based on auth state.
 * Called from the root proxy.ts on every page request.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  // No-cache headers Supabase asks for whenever it writes auth cookies.
  let authHeaders: Record<string, string> = {};

  const supabase = createServerClient<Database>(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        authHeaders = { ...authHeaders, ...headers };
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // Must run before anything else: it verifies the JWT and triggers a token
  // refresh when needed, which writes the new cookies via setAll above.
  const { data } = await supabase.auth.getClaims();
  const isSignedIn = Boolean(data?.claims);
  const { pathname, search } = request.nextUrl;

  // API routes answer with 401 themselves instead of redirecting.
  if (pathname.startsWith("/api/")) {
    return response;
  }

  if (!isSignedIn && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", pathname + search);
    return redirectWithSession(url, response, authHeaders);
  }

  if (isSignedIn && (pathname === "/login" || pathname === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = DEFAULT_SIGNED_IN_PATH;
    url.search = "";
    return redirectWithSession(url, response, authHeaders);
  }

  return response;
}

// A redirect is a new response, so carry over any refreshed session cookies
// (and their no-cache headers); otherwise the browser keeps the stale token.
function redirectWithSession(url: URL, from: NextResponse, headers: Record<string, string>) {
  const redirect = NextResponse.redirect(url);
  from.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  Object.entries(headers).forEach(([key, value]) => redirect.headers.set(key, value));
  return redirect;
}
