import type { Page } from "@playwright/test"

/** Seed staff persona from supabase/seed.sql. */
const SEED_ADMIN_EMAIL = "admin@test.local"
const SEED_ADMIN_PASSWORD = "password123"

export async function loginAsSeedStaff(page: Page): Promise<void> {
  await page.goto("/auth/login")
  await page.locator("#email").fill(SEED_ADMIN_EMAIL)
  await page.locator("#password").fill(SEED_ADMIN_PASSWORD)
  await page.locator("form button[type='submit']").click()
  await page.waitForURL(/\/admin(?:\/|$)/)
}
