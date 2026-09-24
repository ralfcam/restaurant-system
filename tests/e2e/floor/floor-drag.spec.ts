import { expect, test, type Locator, type Page } from "@playwright/test"
import { loginAsSeedStaff } from "../helpers/staff-login"

const FLOOR_CELL_PX = 120
const FOLLOW_TOLERANCE_PX = 2

test.describe("floor layout drag", () => {
  test(
    "mouse drag follows the pointer, snaps to the nearest cell, and persists",
    { tag: "@p1" },
    async ({ page }) => {
      await loginAsSeedStaff(page)
      await page.goto("/admin/floor")

      const chip = tableChip(page, "5")
      await expect(chip).toBeVisible()
      await expectCell(chip, 0, 1)

      await enterEditLayout(page)
      await chip.locator("xpath=..").getByTestId("floor-move-lock").click()

      const before = await chip.boundingBox()
      if (!before) throw new Error("seed table 5 has no bounding box")
      const start = center(before)

      await page.mouse.move(start.x, start.y)
      await page.mouse.down()
      await page.mouse.move(start.x + 45, start.y, { steps: 10 })

      const mid = await chip.boundingBox()
      if (!mid) throw new Error("seed table 5 has no bounding box mid-drag")
      expect(Math.abs(mid.x - (before.x + 45))).toBeLessThanOrEqual(
        FOLLOW_TOLERANCE_PX,
      )
      expect(Math.abs(mid.y - before.y)).toBeLessThanOrEqual(
        FOLLOW_TOLERANCE_PX,
      )

      await page.mouse.move(start.x + FLOOR_CELL_PX, start.y, { steps: 8 })
      await page.mouse.up()

      await expectCell(chip, 1, 1)

      await page.reload()
      const afterReload = tableChip(page, "5")
      await expect(afterReload).toBeVisible()
      await expectCell(afterReload, 1, 1)

      await enterEditLayout(page)
      await afterReload
        .locator("xpath=..")
        .getByTestId("floor-move-lock")
        .click()

      const parked = await afterReload.boundingBox()
      if (!parked)
        throw new Error("seed table 5 has no bounding box after reload")
      const parkedCenter = center(parked)
      await page.mouse.move(parkedCenter.x, parkedCenter.y)
      await page.mouse.down()
      await page.mouse.move(parkedCenter.x - FLOOR_CELL_PX, parkedCenter.y, {
        steps: 10,
      })
      await page.mouse.up()

      await expectCell(afterReload, 0, 1)
    },
  )
})

function tableChip(page: Page, label: string): Locator {
  return page.locator("button").filter({
    has: page.locator("span.font-heading", {
      hasText: new RegExp(`^${label}$`),
    }),
  })
}

async function enterEditLayout(page: Page): Promise<void> {
  await page
    .getByRole("button", { name: /Modifier le plan|Edit layout/ })
    .click()
}

function center(box: { x: number; y: number; width: number; height: number }) {
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

async function expectCell(chip: Locator, x: number, y: number): Promise<void> {
  await expect
    .poll(async () => cellOf(chip), { timeout: 10_000 })
    .toEqual({ x, y })
}

async function cellOf(chip: Locator): Promise<{ x: number; y: number }> {
  const wrapper = chip.locator("xpath=..")
  const canvas = wrapper.locator("xpath=..")
  const box = await wrapper.boundingBox()
  const origin = await canvas.boundingBox()
  if (!box || !origin) return { x: Number.NaN, y: Number.NaN }
  return {
    x: Math.round((box.x - origin.x) / FLOOR_CELL_PX),
    y: Math.round((box.y - origin.y) / FLOOR_CELL_PX),
  }
}
