import { readFileSync } from "node:fs"
import path from "node:path"
import { expect, it } from "vitest"

it("createServiceClient module imports server-only and is not a use-server file", () => {
  const source = readFileSync(
    path.join(process.cwd(), "lib", "supabase", "service.ts"),
    "utf8",
  )

  expect(source).toMatch(/^import ["']server-only["']/)
  expect(source).not.toMatch(/^["']use server["']/m)
})
