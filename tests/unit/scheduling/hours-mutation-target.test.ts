import { describe, expect, it } from "vitest"
import {
  assertIsolatedHoursMutationTarget,
  isIsolatedHoursMutationTarget,
} from "@/lib/scheduling/hours-mutation-target"

const SHARED_HOURS_PROJECT = "https://tilcqrudqxznnpepxjqq.supabase.co"
const OTHER_REMOTE = "https://other-project.supabase.co"

describe("hours mutation target isolation", () => {
  it("rejects the shared linked hours project and non-local hosts; accepts local Supabase URL", () => {
    expect(isIsolatedHoursMutationTarget(SHARED_HOURS_PROJECT)).toBe(false)
    expect(isIsolatedHoursMutationTarget(OTHER_REMOTE)).toBe(false)

    expect(isIsolatedHoursMutationTarget("http://127.0.0.1:54321")).toBe(true)
    expect(isIsolatedHoursMutationTarget("http://localhost:54321")).toBe(true)
    expect(isIsolatedHoursMutationTarget("http://[::1]:54321")).toBe(true)

    expect(() => assertIsolatedHoursMutationTarget(SHARED_HOURS_PROJECT)).toThrow()
    expect(() => assertIsolatedHoursMutationTarget(OTHER_REMOTE)).toThrow()
    expect(() => assertIsolatedHoursMutationTarget(undefined)).toThrow()
    expect(() => assertIsolatedHoursMutationTarget("")).toThrow()

    expect(() =>
      assertIsolatedHoursMutationTarget("http://127.0.0.1:54321"),
    ).not.toThrow()
  })
})
