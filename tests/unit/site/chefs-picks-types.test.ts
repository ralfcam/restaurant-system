import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const repoRoot = process.cwd()
const chefsPicksHookPath = path.join(repoRoot, "hooks", "use-chefs-picks.ts")
const localizedHomepagePath = path.join(repoRoot, "app", "[locale]", "page.tsx")

function readChefsPicksHookSource() {
  return readFileSync(chefsPicksHookPath, "utf8")
}

function readHomepageSource() {
  return readFileSync(localizedHomepagePath, "utf8")
}

describe("homepage Chef's picks types", () => {
  it("homepage chefs picks map callback is MenuItemRow", () => {
    const hook = readChefsPicksHookSource()
    const homepage = readHomepageSource()

    const swrGenericTypesItems =
      /useSWR\s*<[\s\S]*?\bitems\s*:\s*MenuItemRow\[\]/.test(hook)
    const hookReturnTypesItems =
      /function useChefsPicks[\s\S]*?\)\s*:\s*\{[\s\S]*?\bitems\s*:\s*MenuItemRow\[\]/.test(
        hook,
      )

    expect(swrGenericTypesItems || hookReturnTypesItems).toBe(true)

    expect(homepage).toMatch(/featured\.map\(\s*\(\s*item\s*:\s*MenuItemRow\b/)
    expect(homepage).not.toMatch(/featured\.map\(\s*\(\s*item\s*\)\s*=>/)
  })
})
