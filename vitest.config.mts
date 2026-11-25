import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    environment: "jsdom",
    include: ["__tests__/**/*.test.{ts,tsx}"],
    setupFiles: ["./__tests__/setup.ts"],
    // Tests call fakes only, so a run can never spend money on an AI provider.
    env: { AI_PROVIDER: "gemini", GEMINI_API_KEY: "test-key" },
  },
});
