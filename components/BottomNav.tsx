"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/today", label: "Today", icon: "M3 12l9-8 9 8M5 10v10h14V10" },
  {
    href: "/log/photo",
    label: "Photo",
    icon: "M4 8h3l2-3h6l2 3h3v11H4zM12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z",
  },
  { href: "/log/manual", label: "Manual", icon: "M12 5v14M5 12h14" },
  { href: "/history", label: "History", icon: "M4 20V10M10 20V4M16 20v-7M22 20H2" },
];

/** Highlights the current tab. Render inside <Suspense fallback={<NavBar />}>. */
export function BottomNav() {
  return <NavBar pathname={usePathname()} />;
}

export function NavBar({ pathname }: { pathname?: string }) {
  return (
    <nav
      aria-label="Main"
      className="border-border bg-background/95 fixed inset-x-0 bottom-0 z-10 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <ul className="mx-auto flex h-16 max-w-md">
        {links.map(({ href, label, icon }) => {
          const active = pathname?.startsWith(href) ?? false;
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex h-full flex-col items-center justify-center gap-1 text-xs font-medium ${active ? "text-accent" : "text-muted"}`}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="size-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d={icon} />
                </svg>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
