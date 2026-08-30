import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const loginPagePath = path.join(
  process.cwd(),
  "app",
  "auth",
  "login",
  "page.tsx",
)

function readLoginPageSource() {
  return readFileSync(loginPagePath, "utf8")
}

describe("login staff landing", () => {
  it("login does not send non-staff sessions to /admin", () => {
    const source = readLoginPageSource()

    expect(source).not.toMatch(/\bsignUp\s*\(/)
    expect(source).toMatch(/signInWithPassword\s*\(/)

    const afterSignIn = source.slice(source.search(/signInWithPassword\s*\(/))
    const adminAssignIdx = afterSignIn.search(
      /window\.location\.href\s*=\s*["']\/admin["']/,
    )
    const staffGateIdx = afterSignIn.search(/\bisStaffUser\s*\(/)
    const unguardedAdminNav =
      adminAssignIdx >= 0 && (staffGateIdx < 0 || staffGateIdx > adminAssignIdx)

    expect(unguardedAdminNav).toBe(false)
    expect(afterSignIn).toMatch(/\bisStaffUser\s*\(/)
  })
})
