import { test, expect } from "@playwright/test"

const FRENCH_HEADLINE =
  "Votre restaurant en ligne — réservations, carte et salle au même endroit."
const ENGLISH_HEADLINE =
  "Your restaurant, online — reservations, menu, and the floor in one place."

test.describe("site localization", () => {
  test("staff routes stay unprefixed", async ({ page }) => {
    const response = await page.goto("/admin")
    expect(response?.url()).not.toMatch(/\/fr\/admin/)
    expect(response?.url()).not.toMatch(/\/en\/admin/)
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
  })

  test("home renders French by default and shows EN switcher", async ({
    page,
  }) => {
    await page.goto("/")
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      FRENCH_HEADLINE,
    )
    await expect(page.getByTestId("language-switcher").first()).toContainText(
      "EN",
    )
  })

  test("clicking switcher navigates to English home", async ({ page }) => {
    await page.goto("/")
    await page.getByTestId("language-switcher").first().click()
    await expect(page).toHaveURL(/\/en\/?$/)
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      ENGLISH_HEADLINE,
    )
  })

  test("menu is localized by URL and in-content toggle is removed", async ({
    page,
  }) => {
    await page.goto("/menu")
    await expect(page.getByTestId("language-switcher").first()).toContainText(
      "EN",
    )
    await expect(
      page.locator("main [data-testid='language-switcher']"),
    ).toHaveCount(0)

    await page.goto("/en/menu")
    await expect(page.getByTestId("language-switcher").first()).toContainText(
      "FR",
    )
    await expect(page.getByText("Digital menu")).toBeVisible()
    await expect(
      page.locator("main [data-testid='language-switcher']"),
    ).toHaveCount(0)
  })

  test(
    "navbar chrome follows locale catalogs",
    { tag: ["@p1", "@guest"] },
    async ({ page }) => {
      await page.goto("/")
      await expect(
        page.getByRole("button", { name: "Connexion personnel" }),
      ).toBeVisible()
      await expect(
        page.getByRole("button", { name: "Réserver une table" }),
      ).toBeVisible()

      await page.goto("/en")
      await expect(
        page.getByRole("button", { name: "Staff login" }),
      ).toBeVisible()
      await expect(
        page.getByRole("button", { name: "Book a table" }),
      ).toBeVisible()
    },
  )

  test(
    "login shows a French heading and html lang fr",
    { tag: "@p1" },
    async ({ page }) => {
      await page.goto("/auth/login")
      await expect(page.locator("html")).toHaveAttribute("lang", "fr")
      await expect(
        page.getByText("Console personnel", { exact: true }),
      ).toBeVisible()
    },
  )

  test(
    "booking widget shows French labels on / and English labels on /en",
    { tag: "@p1" },
    async ({ page }) => {
      await page.goto("/")
      const widget = page.locator("#reserve")
      await expect(widget.getByTestId("guests")).toContainText("Convives")
      await expect(widget.getByTestId("time")).toContainText("Heure")
      await expect(widget.getByTestId("reserve")).toHaveText("Réserver")

      await page.goto("/en")
      await expect(widget.getByTestId("guests")).toContainText("Guests")
      await expect(widget.getByTestId("time")).toContainText("Time")
      await expect(widget.getByTestId("reserve")).toHaveText("Reserve")
    },
  )
})
