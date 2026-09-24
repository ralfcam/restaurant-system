import path from "node:path"
import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    include: ["tests/integration/**/*.integ.test.ts"],
    setupFiles: ["tests/integration/setup.ts"],
    environment: "node",
    // minimality: one local database; overlapping files race on operating windows
    fileParallelism: false,
    env: {
      RESTAURANT_INTEGRATION_STRICT: "true",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
})
