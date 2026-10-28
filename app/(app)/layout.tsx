import Link from "next/link";
import { Suspense } from "react";
import { logOut } from "@/app/(auth)/actions";
import { BottomNav, NavBar } from "@/components/BottomNav";
import { Button } from "@/components/ui/Button";
import { requireUser } from "@/lib/auth";

// Signed-in area. proxy.ts already redirects signed-out visitors; pages still
// call requireUser() so data access never relies on the proxy alone.
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
      <header className="border-border flex h-14 items-center justify-between border-b px-5">
        <Link href="/today" className="text-accent text-lg font-bold tracking-tight">
          calAI
        </Link>
        <Suspense fallback={null}>
          <UserMenu />
        </Suspense>
      </header>
      {/* Bottom padding keeps content clear of the fixed bottom nav. */}
      <main className="flex flex-1 flex-col px-5 pt-6 pb-[calc(5rem+env(safe-area-inset-bottom))]">
        {children}
      </main>
      {/* The current path is request data on dynamic routes, so it streams in. */}
      <Suspense fallback={<NavBar />}>
        <BottomNav />
      </Suspense>
    </div>
  );
}

async function UserMenu() {
  const user = await requireUser();
  return (
    <div className="flex items-center gap-1">
      <Link
        href="/settings"
        className="text-muted flex h-9 max-w-44 items-center gap-1.5 rounded-lg px-2 text-sm"
        aria-label={`Settings for ${user.email ?? "your account"}`}
      >
        <svg
          viewBox="0 0 24 24"
          className="size-4 shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
        </svg>
        <span className="truncate">{user.email}</span>
      </Link>
      <form action={logOut}>
        <Button type="submit" variant="ghost" className="h-9 px-2 text-sm">
          Log out
        </Button>
      </form>
    </div>
  );
}
