import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  // Components rendered in tests (tests/account.test.ts) use the automatic JSX runtime, as Next does.
  esbuild: { jsx: "automatic" },
  test: { environment: "node", include: ["tests/**/*.test.ts"] },
});
