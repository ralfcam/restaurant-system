import { createRequire } from "node:module"
import { realpathSync } from "node:fs"
import { resolve } from "node:path"
import { expect, test } from "@playwright/test"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { loginAsSeedStaff } from "../helpers/staff-login"

// pnpm does not hoist @next/env; Next depends on it. Resolve from that install.
const requireFromNext = createRequire(
  realpathSync(resolve("node_modules/next/package.json")),
)
const { loadEnvConfig } = requireFromNext("@next/env") as {
  loadEnvConfig: (dir: string) => void
}

loadEnvConfig(process.cwd())

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !anonKey || !serviceRoleKey) {
  throw new Error(
    "BLOCKED (infra): NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY must be set after loading .env.local",
  )
}

// Shared beforeAll inserts one reservation group. Serial keeps that fixture on
// one worker; fullyParallel would run a second beforeAll that deletes it.
test.describe.configure({ mode: "serial" })

const DATE = "2028-06-14"
const GUEST_NAME = "GP13 Overlay Fixture"
const GUEST_EMAIL = "Gp13.Overlay.Guest@Example.com"
const NORMALIZED_EMAIL = GUEST_EMAIL.trim().toLowerCase()
const TIMES = ["10:00", "12:00", "14:00"] as const
const CONF_CODES = TIMES.map((time) => `GP13-OVL-${time.replace(":", "")}`)

function serviceClient(): SupabaseClient {
  return createClient(supabaseUrl!, serviceRoleKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function cleanupFixture(admin: SupabaseClient) {
  await admin
    .from("reservations")
    .delete()
    .in("conf_code", [...CONF_CODES])
  await admin.from("reservations").delete().eq("email", GUEST_EMAIL)
}

test.beforeAll(async () => {
  const admin = serviceClient()
  await cleanupFixture(admin)
  const { error } = await admin.from("reservations").insert(
    TIMES.map((time, index) => ({
      guest_name: GUEST_NAME,
      party_size: 1,
      date: DATE,
      time,
      phone: "555-1313",
      email: GUEST_EMAIL,
      conf_code: CONF_CODES[index],
    })),
  )
  if (error) {
    throw new Error(
      `reservation fixture insert failed: ${error.message} (${error.code ?? "no code"})`,
    )
  }
})

test.afterAll(async () => {
  await cleanupFixture(serviceClient())
})

test(
  "guest profile opens as a modal over reservations and closes back to the same date",
  { tag: "@p1" },
  async ({ page }) => {
    await loginAsSeedStaff(page)
    await page.goto(`/admin/reservations?date=${DATE}`)

    const guestItem = page.locator("li").filter({ hasText: GUEST_NAME }).first()
    await expect(guestItem).toBeVisible()
    await guestItem.getByRole("link", { name: "Fiche convive" }).click()

    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText(NORMALIZED_EMAIL)).toBeVisible()
    await expect(dialog.locator("tbody tr")).toHaveCount(3)
    await expect(guestItem).toBeAttached()

    await dialog.getByRole("button", { name: "Close" }).click()
    await expect(page).toHaveURL(`/admin/reservations?date=${DATE}`)
    await expect(page.getByRole("dialog")).toHaveCount(0)
    await expect(guestItem).toBeVisible()

    await guestItem.getByRole("link", { name: "Fiche convive" }).click()
    await expect(dialog).toBeVisible()
    await page.keyboard.press("Escape")
    await expect(page).toHaveURL(`/admin/reservations?date=${DATE}`)
    await expect(page.getByRole("dialog")).toHaveCount(0)

    await page.goto(`/admin/customers/${encodeURIComponent(NORMALIZED_EMAIL)}`)
    await expect(page.getByText(NORMALIZED_EMAIL)).toBeVisible()
    expect(await page.locator("body").innerText()).not.toContain("%40")
  },
)

test(
  "guest profile save persists name and phone after reload",
  { tag: "@p0" },
  async ({ page }) => {
    const nextPhone = "555-9090"
    await loginAsSeedStaff(page)
    await page.goto(`/admin/reservations?date=${DATE}`)

    const guestItem = page.locator("li").filter({ hasText: GUEST_NAME }).first()
    await expect(guestItem).toBeVisible()
    await guestItem.getByRole("link", { name: "Fiche convive" }).click()

    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()
    await dialog.getByLabel("Téléphone", { exact: true }).fill(nextPhone)
    await dialog
      .getByRole("button", { name: "Enregistrer", exact: true })
      .click()
    await expect(page.getByText("Enregistré", { exact: true })).toBeVisible()

    await page.goto(`/admin/reservations?date=${DATE}`)
    await expect(page.getByRole("dialog")).toHaveCount(0)
    await guestItem.getByRole("link", { name: "Fiche convive" }).click()
    await expect(dialog).toBeVisible()
    await expect(dialog.getByLabel("Nom", { exact: true })).toHaveValue(
      GUEST_NAME,
    )
    await expect(dialog.getByLabel("Téléphone", { exact: true })).toHaveValue(
      nextPhone,
    )

    const { data, error } = await serviceClient()
      .from("reservations")
      .select("guest_name, phone, email")
      .eq("email", GUEST_EMAIL)
    expect(error).toBeNull()
    expect(data).toHaveLength(3)
    for (const row of data ?? []) {
      expect(row.guest_name).toBe(GUEST_NAME)
      expect(row.phone).toBe(nextPhone)
      expect(row.email).toBe(GUEST_EMAIL)
    }
  },
)
