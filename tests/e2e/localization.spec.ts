import { test, expect } from "@playwright/test"

const FRENCH_HEADLINE =
  "Une cuisine suisse moderne mariée à la pureté et la rigueur de la philosophie nordique."
const ENGLISH_HEADLINE =
  "Modern Swiss cuisine married to the purity and rigor of Nordic philosophy."

test.describe("site localization", () => {
  test("admin stays unlocalized", async ({ page }) => {
    const response = await page.goto("/admin")
    expect(response?.url()).not.toMatch(/\/fr\/admin/)
    expect(response?.url()).not.toMatch(/\/en\/admin/)
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
  })

  test("home renders French by default and shows EN switcher", async ({ page }) => {
    await page.goto("/")
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(FRENCH_HEADLINE)
    await expect(page.getByTestId("language-switcher").first()).toContainText("EN")
  })

  test("clicking switcher navigates to English home", async ({ page }) => {
    await page.goto("/")
    await page.getByTestId("language-switcher").first().click()
    await expect(page).toHaveURL(/\/en\/?$/)
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(ENGLISH_HEADLINE)
  })

  test("menu is localized by URL and in-content toggle is removed", async ({ page }) => {
    await page.goto("/menu")
    await expect(page.getByTestId("language-switcher").first()).toContainText("EN")
    await expect(page.locator("main [data-testid='language-switcher']")).toHaveCount(0)

    await page.goto("/en/menu")
    await expect(page.getByTestId("language-switcher").first()).toContainText("FR")
    await expect(page.getByText("Digital menu")).toBeVisible()
    await expect(page.locator("main [data-testid='language-switcher']")).toHaveCount(0)
  })
})
