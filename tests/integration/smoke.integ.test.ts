import { describe, expect, it } from "vitest"
import { authEnvReady } from "./helpers/env"

describe.skipIf(!authEnvReady)("integration harness", () => {
  it("has Supabase URL configured", () => {
    expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toBeTruthy()
  })
})
