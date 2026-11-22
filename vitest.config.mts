import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const fromRoot = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@cell-hygiene/core": fromRoot("./packages/core/src/index.ts"),
      "@cell-hygiene/guard": fromRoot("./packages/guard/src/index.ts"),
      "@": fromRoot("./apps/web/src"),
    },
  },
  test: {
    environment: "node",
    include: ["packages/**/*.test.ts", "apps/web/src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["packages/*/src/**/*.ts"],
      reporter: ["text", "html"],
    },
  },
});
