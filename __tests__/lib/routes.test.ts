import { describe, expect, it } from "vitest";
import { isPublicPath, safeNextPath } from "@/lib/routes";

describe("safeNextPath", () => {
  it.each(["/today", "/history/2026-10-27?from=login"])("keeps the same-site path %s", (path) => {
    expect(safeNextPath(path)).toBe(path);
  });

  it.each(["//evil.com", "/\\evil.com", "https://evil.com", "evil.com", "", null, undefined, 42])(
    "sends %j to the default page instead of another site",
    (next) => {
      expect(safeNextPath(next)).toBe("/today");
    },
  );
});

describe("isPublicPath", () => {
  it.each(["/login", "/signup", "/auth/callback", "/privacy"])("%s needs no session", (path) => {
    expect(isPublicPath(path)).toBe(true);
  });

  it.each(["/", "/today", "/history", "/settings", "/log/photo"])("%s needs a session", (path) => {
    expect(isPublicPath(path)).toBe(false);
  });
});
