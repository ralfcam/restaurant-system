import { describe, expect, it } from "vitest"
import {
  assertIsolatedHoursMutationTarget,
  isIsolatedHoursMutationTarget,
} from "@/lib/scheduling/hours-mutation-target"

const SHARED_HOURS_PROJECT = "https://tilcqrudqxznnpepxjqq.supabase.co"
const OTHER_REMOTE = "https://other-project.supabase.co"
const LOCAL_SUPABASE = "http://127.0.0.1:54321"

describe("hours mutation target isolation", () => {
  it("omitted url follows env; explicit url wins even when env is local", () => {
    const previous = process.env.NEXT_PUBLIC_SUPABASE_URL
    try {
      expect(isIsolatedHoursMutationTarget(SHARED_HOURS_PROJECT)).toBe(false)
      expect(isIsolatedHoursMutationTarget(OTHER_REMOTE)).toBe(false)

      expect(isIsolatedHoursMutationTarget(LOCAL_SUPABASE)).toBe(true)
      expect(isIsolatedHoursMutationTarget("http://localhost:54321")).toBe(true)
      expect(isIsolatedHoursMutationTarget("http://[::1]:54321")).toBe(true)

      process.env.NEXT_PUBLIC_SUPABASE_URL = LOCAL_SUPABASE
      expect(() => assertIsolatedHoursMutationTarget(undefined)).not.toThrow()

      delete process.env.NEXT_PUBLIC_SUPABASE_URL
      expect(() => assertIsolatedHoursMutationTarget(undefined)).toThrow()

      process.env.NEXT_PUBLIC_SUPABASE_URL = ""
      expect(() => assertIsolatedHoursMutationTarget(undefined)).toThrow()

      process.env.NEXT_PUBLIC_SUPABASE_URL = LOCAL_SUPABASE
      expect(() =>
        assertIsolatedHoursMutationTarget(SHARED_HOURS_PROJECT),
      ).toThrow()
      expect(() => assertIsolatedHoursMutationTarget(OTHER_REMOTE)).toThrow()
      expect(() => assertIsolatedHoursMutationTarget("")).toThrow()

      expect(() =>
        assertIsolatedHoursMutationTarget(LOCAL_SUPABASE),
      ).not.toThrow()
      expect(() =>
        assertIsolatedHoursMutationTarget("http://localhost:54321"),
      ).not.toThrow()
      expect(() =>
        assertIsolatedHoursMutationTarget("http://[::1]:54321"),
      ).not.toThrow()
    } finally {
      if (previous === undefined) {
        delete process.env.NEXT_PUBLIC_SUPABASE_URL
      } else {
        process.env.NEXT_PUBLIC_SUPABASE_URL = previous
      }
    }
  })
})
