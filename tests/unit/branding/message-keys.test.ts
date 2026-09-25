import { beforeEach, describe, expect, it, vi } from "vitest"
import { expectCatalogKey } from "@/tests/unit/i18n/helpers/catalog"
import {
  MAX_HERO_BYTES,
  MAX_LOGO_BYTES,
  validateHeroUpload,
  validateLogoUpload,
} from "@/lib/branding"
import type { MenuItemRow } from "@/app/actions/menu"

const KEYS = {
  chooseImage: "errors.branding.chooseImage",
  logoContentType: "errors.branding.logoContentType",
  logoTooLarge: "errors.branding.logoTooLarge",
  heroContentType: "errors.branding.heroContentType",
  heroTooLarge: "errors.branding.heroTooLarge",
  unauthorized: "errors.branding.unauthorized",
  logoUploadFailed: "errors.branding.logoUploadFailed",
  logoStorageRemoveFailed: "errors.branding.logoStorageRemoveFailed",
  logoSaveFailed: "errors.branding.logoSaveFailed",
  logoRemoveFailed: "errors.branding.logoRemoveFailed",
  heroUploadFailed: "errors.branding.heroUploadFailed",
  heroStorageRemoveFailed: "errors.branding.heroStorageRemoveFailed",
  heroSaveFailed: "errors.branding.heroSaveFailed",
  heroRemoveFailed: "errors.branding.heroRemoveFailed",
  slotIntervalSaveFailed: "errors.branding.slotIntervalSaveFailed",
  occupancySaveFailed: "errors.branding.occupancySaveFailed",
  safetyBufferSaveFailed: "errors.branding.safetyBufferSaveFailed",
  marketingUnauthorized: "errors.marketing.unauthorized",
  reviewEmailRequiresCopyAndHttps:
    "errors.marketing.reviewEmailRequiresCopyAndHttps",
  reviewEmailSaveFailed: "errors.marketing.reviewEmailSaveFailed",
  menuUnauthorized: "errors.menu.unauthorized",
  chefsPicksUpdateFailed: "errors.menu.chefsPicksUpdateFailed",
  chefsPicksLimit: "errors.menu.chefsPicksLimit",
  menuUnmapped: "errors.menu.unmapped",
} as const

type CatalogParams = Record<string, string | number>

type QueryResult = {
  data: unknown
  error: { message?: string; code?: string } | null
  count?: number | null
}

const mocks = vi.hoisted(() => ({
  requireStaffUser: vi.fn(),
  requireSuperAdminUser: vi.fn(),
  revalidatePath: vi.fn(),
  upload: vi.fn(),
  getPublicUrl: vi.fn(),
  remove: vi.fn(),
  createBucket: vi.fn(),
  serviceQueue: [] as QueryResult[],
}))

vi.mock("@/lib/supabase/require-staff", () => ({
  requireStaffUser: mocks.requireStaffUser,
  requireSuperAdminUser: mocks.requireSuperAdminUser,
}))

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}))

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({
    from: () => {
      const next = mocks.serviceQueue.shift() ?? {
        data: null,
        error: { message: "unscripted query" },
      }
      return thenable(next)
    },
    storage: {
      from: () => ({
        upload: mocks.upload,
        getPublicUrl: mocks.getPublicUrl,
        remove: mocks.remove,
      }),
      createBucket: mocks.createBucket,
    },
  }),
}))

function thenable(value: QueryResult) {
  const builder: Record<string, unknown> = {}
  const self = new Proxy(builder, {
    get(_target, prop) {
      if (prop === "then") {
        return (
          resolve: (result: QueryResult) => unknown,
          reject?: (reason: unknown) => unknown,
        ) => Promise.resolve(value).then(resolve, reject)
      }
      if (prop === "single" || prop === "maybeSingle") {
        return async () => {
          const row = Array.isArray(value.data)
            ? (value.data[0] ?? null)
            : value.data
          return { data: row, error: value.error }
        }
      }
      return () => self
    },
  })
  return self
}

function expectCatalogMessage(
  actual: unknown,
  key: string,
  params?: CatalogParams,
) {
  const resolved =
    typeof actual === "object" &&
    actual !== null &&
    "key" in actual &&
    typeof (actual as { key: unknown }).key === "string"
      ? (actual as { key: string }).key
      : actual
  expect(resolved).toBe(key)
  expect(actual).toEqual(params === undefined ? key : { key, params })
  expectCatalogKey(key)
}

async function thrownMessage(run: () => Promise<unknown>): Promise<unknown> {
  try {
    await run()
    return undefined
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }
}

function ok(data: unknown, count?: number | null): QueryResult {
  return {
    data,
    error: null,
    ...(count === undefined ? {} : { count }),
  }
}

function fail(message: string, code?: string): QueryResult {
  return { data: null, error: { message, ...(code ? { code } : {}) } }
}

function schemaCache(table: string): QueryResult {
  return fail(
    `Could not find the table 'public.${table}' in the schema cache`,
    "PGRST205",
  )
}

function script(...results: QueryResult[]) {
  mocks.serviceQueue.length = 0
  mocks.serviceQueue.push(...results)
}

const pngUpload = {
  base64: "aaaa",
  contentType: "image/png",
  size: 128,
}

const reviewEmail = {
  enabled: true,
  copy: "Thank you for dining with us.",
  mapsUrl: "https://maps.google.com/?q=Restaurant+Link",
  delayHours: 24,
}

const catalogRow: Omit<MenuItemRow, "created_at"> = {
  id: "item-1",
  slug: "item-1",
  name: "Tortilla",
  name_en: "Tortilla",
  description: "desc",
  description_en: "desc",
  price: "8",
  price_value: 8,
  menu_id: "midi",
  section: "starters",
  section_en: "starters",
  popular: false,
  available: true,
  sort_order: 1,
}

const createFields = {
  name: catalogRow.name,
  name_en: catalogRow.name_en,
  description: catalogRow.description,
  description_en: catalogRow.description_en,
  price: catalogRow.price,
  price_value: catalogRow.price_value,
  menu_id: catalogRow.menu_id,
  section: catalogRow.section,
  section_en: catalogRow.section_en,
  popular: false,
  available: true,
  sort_order: catalogRow.sort_order,
}

const settingsSchemaMiss = schemaCache("restaurant_settings")

describe("branding, marketing, and menu producers return errors.* catalog keys", () => {
  beforeEach(() => {
    mocks.requireStaffUser.mockReset()
    mocks.requireSuperAdminUser.mockReset()
    mocks.revalidatePath.mockReset()
    mocks.upload.mockReset()
    mocks.getPublicUrl.mockReset()
    mocks.remove.mockReset()
    mocks.createBucket.mockReset()
    mocks.serviceQueue.length = 0
    mocks.requireStaffUser.mockResolvedValue({ id: "staff-1" })
    mocks.requireSuperAdminUser.mockResolvedValue({ id: "super-admin-1" })
    mocks.upload.mockResolvedValue({ error: null })
    mocks.remove.mockResolvedValue({ error: null })
    mocks.createBucket.mockResolvedValue({ error: null })
    mocks.getPublicUrl.mockReturnValue({
      data: { publicUrl: "https://cdn.example/asset.png" },
    })
    vi.spyOn(console, "error").mockImplementation(() => {})
  })

  it("validateLogoUpload and validateHeroUpload return errors.branding.* catalog keys", () => {
    expectCatalogMessage(
      validateLogoUpload({ ...pngUpload, base64: "" }),
      KEYS.chooseImage,
    )
    expectCatalogMessage(
      validateLogoUpload({ ...pngUpload, size: 0 }),
      KEYS.chooseImage,
    )
    expectCatalogMessage(
      validateHeroUpload({ ...pngUpload, base64: "" }),
      KEYS.chooseImage,
    )
    expectCatalogMessage(
      validateHeroUpload({ ...pngUpload, size: 0 }),
      KEYS.chooseImage,
    )
    expectCatalogMessage(
      validateLogoUpload({ ...pngUpload, contentType: "image/gif" }),
      KEYS.logoContentType,
    )
    expectCatalogMessage(
      validateLogoUpload({ ...pngUpload, size: MAX_LOGO_BYTES + 1 }),
      KEYS.logoTooLarge,
    )
    expectCatalogMessage(
      validateHeroUpload({ ...pngUpload, contentType: "image/gif" }),
      KEYS.heroContentType,
    )
    expectCatalogMessage(
      validateHeroUpload({ ...pngUpload, contentType: "image/svg+xml" }),
      KEYS.heroContentType,
    )
    expectCatalogMessage(
      validateHeroUpload({ ...pngUpload, size: MAX_HERO_BYTES + 1 }),
      KEYS.heroTooLarge,
    )
  })

  it("branding mutators throw errors.branding.unauthorized", async () => {
    mocks.requireSuperAdminUser.mockResolvedValue(null)
    const actions = await import("@/app/actions/branding")

    expectCatalogMessage(
      await thrownMessage(() => actions.uploadRestaurantLogo(pngUpload)),
      KEYS.unauthorized,
    )
    expectCatalogMessage(
      await thrownMessage(() => actions.removeRestaurantLogo()),
      KEYS.unauthorized,
    )
    expectCatalogMessage(
      await thrownMessage(() => actions.uploadRestaurantHeroImage(pngUpload)),
      KEYS.unauthorized,
    )
    expectCatalogMessage(
      await thrownMessage(() => actions.removeRestaurantHeroImage()),
      KEYS.unauthorized,
    )
    expectCatalogMessage(
      await thrownMessage(() => actions.updateSlotIntervalMinutes(15)),
      KEYS.unauthorized,
    )
    expectCatalogMessage(
      await thrownMessage(() => actions.updateOccupancyDurationMinutes(90)),
      KEYS.unauthorized,
    )
    expectCatalogMessage(
      await thrownMessage(() => actions.updateSafetyBufferMinutes(15)),
      KEYS.unauthorized,
    )
  })

  it("logo storage upload failure is errors.branding.logoUploadFailed", async () => {
    const { uploadRestaurantLogo } = await import("@/app/actions/branding")
    mocks.upload.mockResolvedValue({ error: { message: "permission denied" } })
    expectCatalogMessage(
      (await uploadRestaurantLogo(pngUpload)).error,
      KEYS.logoUploadFailed,
    )
  })

  it("logo bucket create failure is errors.branding.logoUploadFailed", async () => {
    const { uploadRestaurantLogo } = await import("@/app/actions/branding")
    mocks.upload.mockResolvedValue({ error: { message: "Bucket not found" } })
    mocks.createBucket.mockResolvedValue({
      error: { message: "permission denied" },
    })
    expectCatalogMessage(
      (await uploadRestaurantLogo(pngUpload)).error,
      KEYS.logoUploadFailed,
    )
  })

  it("logo save-after-upload failure is errors.branding.logoSaveFailed", async () => {
    const { uploadRestaurantLogo } = await import("@/app/actions/branding")
    script(settingsSchemaMiss)
    expectCatalogMessage(
      (await uploadRestaurantLogo(pngUpload)).error,
      KEYS.logoSaveFailed,
    )
  })

  it("logo upload content type is errors.branding.logoContentType", async () => {
    const { uploadRestaurantLogo } = await import("@/app/actions/branding")
    expectCatalogMessage(
      (await uploadRestaurantLogo({ ...pngUpload, contentType: "image/gif" }))
        .error,
      KEYS.logoContentType,
    )
  })

  it("logo storage remove is errors.branding.logoStorageRemoveFailed", async () => {
    const { removeRestaurantLogo } = await import("@/app/actions/branding")
    mocks.remove.mockResolvedValue({ error: { message: "permission denied" } })
    expectCatalogMessage(
      (await removeRestaurantLogo()).error,
      KEYS.logoStorageRemoveFailed,
    )
  })

  it("logo settings remove is errors.branding.logoRemoveFailed", async () => {
    const { removeRestaurantLogo } = await import("@/app/actions/branding")
    mocks.remove.mockResolvedValue({ error: null })
    script(settingsSchemaMiss)
    expectCatalogMessage(
      (await removeRestaurantLogo()).error,
      KEYS.logoRemoveFailed,
    )
  })

  it("hero storage upload failure is errors.branding.heroUploadFailed", async () => {
    const { uploadRestaurantHeroImage } = await import("@/app/actions/branding")
    mocks.upload.mockResolvedValue({ error: { message: "permission denied" } })
    expectCatalogMessage(
      (await uploadRestaurantHeroImage(pngUpload)).error,
      KEYS.heroUploadFailed,
    )
  })

  it("hero bucket create failure is errors.branding.heroUploadFailed", async () => {
    const { uploadRestaurantHeroImage } = await import("@/app/actions/branding")
    mocks.upload.mockResolvedValue({ error: { message: "Bucket not found" } })
    mocks.createBucket.mockResolvedValue({
      error: { message: "permission denied" },
    })
    expectCatalogMessage(
      (await uploadRestaurantHeroImage(pngUpload)).error,
      KEYS.heroUploadFailed,
    )
  })

  it("hero save-after-upload failure is errors.branding.heroSaveFailed", async () => {
    const { uploadRestaurantHeroImage } = await import("@/app/actions/branding")
    script(settingsSchemaMiss)
    expectCatalogMessage(
      (await uploadRestaurantHeroImage(pngUpload)).error,
      KEYS.heroSaveFailed,
    )
  })

  it("hero upload content type is errors.branding.heroContentType", async () => {
    const { uploadRestaurantHeroImage } = await import("@/app/actions/branding")
    expectCatalogMessage(
      (
        await uploadRestaurantHeroImage({
          ...pngUpload,
          contentType: "image/gif",
        })
      ).error,
      KEYS.heroContentType,
    )
    expectCatalogMessage(
      (
        await uploadRestaurantHeroImage({
          ...pngUpload,
          contentType: "image/svg+xml",
        })
      ).error,
      KEYS.heroContentType,
    )
  })

  it("hero storage remove is errors.branding.heroStorageRemoveFailed", async () => {
    const { removeRestaurantHeroImage } = await import("@/app/actions/branding")
    mocks.remove.mockResolvedValue({ error: { message: "permission denied" } })
    expectCatalogMessage(
      (await removeRestaurantHeroImage()).error,
      KEYS.heroStorageRemoveFailed,
    )
  })

  it("hero settings remove is errors.branding.heroRemoveFailed", async () => {
    const { removeRestaurantHeroImage } = await import("@/app/actions/branding")
    mocks.remove.mockResolvedValue({ error: null })
    script(settingsSchemaMiss)
    expectCatalogMessage(
      (await removeRestaurantHeroImage()).error,
      KEYS.heroRemoveFailed,
    )
  })

  it("slot interval save failure is errors.branding.slotIntervalSaveFailed", async () => {
    const { updateSlotIntervalMinutes } = await import("@/app/actions/branding")
    script(settingsSchemaMiss)
    expectCatalogMessage(
      (await updateSlotIntervalMinutes(15)).error,
      KEYS.slotIntervalSaveFailed,
    )
  })

  it("occupancy duration save failure is errors.branding.occupancySaveFailed", async () => {
    const { updateOccupancyDurationMinutes } =
      await import("@/app/actions/branding")
    script(settingsSchemaMiss)
    expectCatalogMessage(
      (await updateOccupancyDurationMinutes(90)).error,
      KEYS.occupancySaveFailed,
    )
  })

  it("safety buffer save failure is errors.branding.safetyBufferSaveFailed", async () => {
    const { updateSafetyBufferMinutes } = await import("@/app/actions/branding")
    script(settingsSchemaMiss)
    expectCatalogMessage(
      (await updateSafetyBufferMinutes(15)).error,
      KEYS.safetyBufferSaveFailed,
    )
  })

  it("review-email unauthorized is errors.marketing.unauthorized", async () => {
    mocks.requireSuperAdminUser.mockResolvedValue(null)
    const { saveReviewEmailSettings } = await import("@/app/actions/marketing")
    expectCatalogMessage(
      (await saveReviewEmailSettings(reviewEmail)).error,
      KEYS.marketingUnauthorized,
    )
  })

  it("blank review-email copy is errors.marketing.reviewEmailRequiresCopyAndHttps", async () => {
    const { saveReviewEmailSettings } = await import("@/app/actions/marketing")
    expectCatalogMessage(
      (
        await saveReviewEmailSettings({
          ...reviewEmail,
          enabled: true,
          copy: "   ",
        })
      ).error,
      KEYS.reviewEmailRequiresCopyAndHttps,
    )
  })

  it("http review-email Maps URL is errors.marketing.reviewEmailRequiresCopyAndHttps", async () => {
    const { saveReviewEmailSettings } = await import("@/app/actions/marketing")
    expectCatalogMessage(
      (
        await saveReviewEmailSettings({
          ...reviewEmail,
          enabled: true,
          mapsUrl: "http://maps.google.com/?q=Restaurant+Link",
        })
      ).error,
      KEYS.reviewEmailRequiresCopyAndHttps,
    )
  })

  it("review-email save failure is errors.marketing.reviewEmailSaveFailed", async () => {
    const { saveReviewEmailSettings } = await import("@/app/actions/marketing")
    script(settingsSchemaMiss)
    expectCatalogMessage(
      (await saveReviewEmailSettings(reviewEmail)).error,
      KEYS.reviewEmailSaveFailed,
    )
  })

  it("chef's picks unauthorized is errors.menu.unauthorized", async () => {
    mocks.requireStaffUser.mockResolvedValue(null)
    const { setChefsPicksEnabled } = await import("@/app/actions/menu")
    expectCatalogMessage(
      (await setChefsPicksEnabled(true)).error,
      KEYS.menuUnauthorized,
    )
  })

  it("chef's picks update failure is errors.menu.chefsPicksUpdateFailed", async () => {
    const { setChefsPicksEnabled } = await import("@/app/actions/menu")
    script(schemaCache("restaurant_settings"))
    expectCatalogMessage(
      (await setChefsPicksEnabled(false)).error,
      KEYS.chefsPicksUpdateFailed,
    )
  })

  it("upsert pin limit is errors.menu.chefsPicksLimit", async () => {
    const { upsertMenuItem } = await import("@/app/actions/menu")
    script(ok({ popular: false }), ok(null, 5))
    expectCatalogMessage(
      (await upsertMenuItem({ ...catalogRow, popular: true })).error,
      KEYS.chefsPicksLimit,
    )
  })

  it("create pin limit is errors.menu.chefsPicksLimit", async () => {
    const { createMenuItem } = await import("@/app/actions/menu")
    script(ok(null, 5))
    expectCatalogMessage(
      (await createMenuItem({ ...createFields, popular: true })).error,
      KEYS.chefsPicksLimit,
    )
  })

  it("menu item writers return errors.menu.unauthorized", async () => {
    mocks.requireStaffUser.mockResolvedValue(null)
    const {
      upsertMenuItem,
      createMenuItem,
      deleteMenuItem,
      toggleMenuItemAvailability,
    } = await import("@/app/actions/menu")

    expectCatalogMessage(
      (await upsertMenuItem(catalogRow)).error,
      KEYS.menuUnauthorized,
    )
    expectCatalogMessage(
      (await createMenuItem(createFields)).error,
      KEYS.menuUnauthorized,
    )
    expectCatalogMessage(
      (await deleteMenuItem("item-1")).error,
      KEYS.menuUnauthorized,
    )
    expectCatalogMessage(
      (await toggleMenuItemAvailability("item-1", false)).error,
      KEYS.menuUnauthorized,
    )
  })

  it("upsertMenuItem collapses schema-cache text to errors.menu.unmapped", async () => {
    const { upsertMenuItem } = await import("@/app/actions/menu")
    script(schemaCache("menu_items"))
    expectCatalogMessage(
      (await upsertMenuItem(catalogRow)).error,
      KEYS.menuUnmapped,
    )
  })

  it("createMenuItem collapses raw database text to errors.menu.unmapped", async () => {
    const { createMenuItem } = await import("@/app/actions/menu")
    script(fail("duplicate key value violates unique constraint", "23505"))
    expectCatalogMessage(
      (await createMenuItem(createFields)).error,
      KEYS.menuUnmapped,
    )
  })

  it("deleteMenuItem collapses raw database text to errors.menu.unmapped", async () => {
    const { deleteMenuItem } = await import("@/app/actions/menu")
    script(fail("permission denied for table menu_items"))
    expectCatalogMessage(
      (await deleteMenuItem("item-1")).error,
      KEYS.menuUnmapped,
    )
  })

  it("toggleMenuItemAvailability collapses schema-cache text to errors.menu.unmapped", async () => {
    const { toggleMenuItemAvailability } = await import("@/app/actions/menu")
    script(
      fail(
        "Could not find the 'available' column of 'menu_items' in the schema cache",
        "PGRST204",
      ),
    )
    expectCatalogMessage(
      (await toggleMenuItemAvailability("item-1", false)).error,
      KEYS.menuUnmapped,
    )
  })
})
