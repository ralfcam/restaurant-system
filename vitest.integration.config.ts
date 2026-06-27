import path from "node:path"
import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    include: ["tests/integration/**/*.integ.test.ts"],
    setupFiles: ["tests/integration/setup.ts"],
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
})
