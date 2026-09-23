import { globSync, readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const root = process.cwd()
const INTEG_INCLUDE = "tests/integration/**/*.integ.test.ts"
const INTEG_SETUP = "tests/integration/setup.ts"
const MENUS_PRIVILEGE_INTEG =
  "tests/integration/menu/menus-privileges.integ.test.ts"

describe("menus privilege integ STRICT fail-closed (MT-4b)", () => {
  it("menus privilege integ is covered by STRICT fail-closed setup", () => {
    const config = readFileSync(
      path.join(root, "vitest.integration.config.ts"),
      "utf8",
    )
    expect(config).toContain(`include: ["${INTEG_INCLUDE}"]`)
    expect(config).toContain(`setupFiles: ["${INTEG_SETUP}"]`)

    const setup = readFileSync(path.join(root, INTEG_SETUP), "utf8")
    expect(setup).toMatch(
      /if \(integrationStrict && !authEnvReady\) \{\s*throw new Error\(/,
    )

    const matched = globSync(INTEG_INCLUDE, { cwd: root }).map((hit) =>
      hit.replaceAll("\\", "/"),
    )
    expect(matched).toContain(MENUS_PRIVILEGE_INTEG)
  })

  it("integration config sets STRICT so menus privilege integ cannot skip-green", () => {
    const config = readFileSync(
      path.join(root, "vitest.integration.config.ts"),
      "utf8",
    )
    expect(config).toMatch(
      /\benv\s*:\s*\{[\s\S]*?\bRESTAURANT_INTEGRATION_STRICT\s*:\s*"true"/,
    )
  })
})
