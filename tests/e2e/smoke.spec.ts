import { test, expect } from "@playwright/test"

test.skip("e2e harness placeholder — enable when dev server baseline exists", async ({
  page,
}) => {
  await page.goto("/")
  await expect(page).toHaveTitle(/.+/)
})
