import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const root = process.cwd()
const setupPath = path.join(root, "playwright.global-setup.ts")
const configPath = path.join(root, "playwright.config.ts")

const HOSTED_SUPABASE_URL = "https://tilcqrudqxznnpepxjqq.supabase.co"

describe("GP-16 Playwright guest-profile env is local or unset", () => {
  it("playwright global setup rejects a hosted Supabase URL and allows loopback or unset", async () => {
    expect(existsSync(setupPath)).toBe(true)

    const configSource = readFileSync(configPath, "utf8")
    expect(configSource).toMatch(
      /globalSetup\s*:\s*["']\.\/playwright\.global-setup\.ts["']/,
    )

    const setupSource = readFileSync(setupPath, "utf8")
    const loadEnvAt = setupSource.search(/loadEnvConfig\s*\(/)
    const guardCallAt = setupSource.search(
      /assertPlaywrightSupabaseUrlIsLocalOrUnset\s*\(\s*\)/,
    )
    expect(loadEnvAt).toBeGreaterThanOrEqual(0)
    expect(guardCallAt).toBeGreaterThan(loadEnvAt)

    const { assertPlaywrightSupabaseUrlIsLocalOrUnset } =
      (await import("../../../playwright.global-setup")) as {
        assertPlaywrightSupabaseUrlIsLocalOrUnset: (url?: string) => void
      }

    expect(() =>
      assertPlaywrightSupabaseUrlIsLocalOrUnset(HOSTED_SUPABASE_URL),
    ).toThrow()

    expect(() =>
      assertPlaywrightSupabaseUrlIsLocalOrUnset("http://127.0.0.1:45321"),
    ).not.toThrow()
    expect(() =>
      assertPlaywrightSupabaseUrlIsLocalOrUnset("http://localhost:45321"),
    ).not.toThrow()
    expect(() =>
      assertPlaywrightSupabaseUrlIsLocalOrUnset("http://[::1]:45321"),
    ).not.toThrow()

    const previous = process.env.NEXT_PUBLIC_SUPABASE_URL
    try {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL
      expect(() => assertPlaywrightSupabaseUrlIsLocalOrUnset()).not.toThrow()

      process.env.NEXT_PUBLIC_SUPABASE_URL = ""
      expect(() => assertPlaywrightSupabaseUrlIsLocalOrUnset()).not.toThrow()
    } finally {
      if (previous === undefined) {
        delete process.env.NEXT_PUBLIC_SUPABASE_URL
      } else {
        process.env.NEXT_PUBLIC_SUPABASE_URL = previous
      }
    }
  })
})
