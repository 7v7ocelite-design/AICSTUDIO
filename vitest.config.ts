import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": "/workspace"
    }
  },
  test: {
    environment: "node",
    include: ["__tests__/**/*.test.ts"],
    globals: true
  }
});
