import Link from "next/link";
import { Suspense } from "react";
import { logOut } from "@/app/(auth)/actions";
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
      <main className="flex flex-1 flex-col px-5 py-6">{children}</main>
    </div>
  );
}

async function UserMenu() {
  const user = await requireUser();
  return (
    <form action={logOut} className="flex items-center gap-2">
      <span className="text-muted max-w-40 truncate text-sm">{user.email}</span>
      <Button type="submit" variant="ghost" className="h-9 px-2 text-sm">
        Log out
      </Button>
    </form>
  );
}
