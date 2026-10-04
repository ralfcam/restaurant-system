import { readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"
import type { ReactElement } from "react"
import { jsx } from "react/jsx-runtime"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  requireSuperAdminUser: vi.fn(),
  createServiceClient: vi.fn(),
  upsert: vi.fn(),
  revalidatePath: vi.fn(),
}))

vi.mock("@/lib/supabase/require-staff", () => ({
  requireSuperAdminUser: mocks.requireSuperAdminUser,
}))

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: (...args: unknown[]) =>
    mocks.createServiceClient(...args),
}))

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}))

const root = process.cwd()

const TEXT_COLUMNS = [
  "restaurant_display_name",
  "tagline",
  "welcome_title",
  "welcome_message",
  "closing_message",
] as const

const EXAMPLE_SENTENCES = [
  "Une table, des souvenirs à partager",
  "Bienvenue chez nous",
  "Une cuisine de saison, des produits locaux",
] as const

const BLOCK_TEST_ID = {
  restaurant_display_name: "widget-restaurant-display-name",
  tagline: "widget-tagline",
  welcome_title: "widget-welcome-title",
  welcome_message: "widget-welcome-message",
  closing_message: "widget-closing-message",
} as const

type EditorialInput = {
  restaurant_display_name: string
  tagline: string
  welcome_title: string
  welcome_message: string
  closing_message: string
}

type SavedEditorial = {
  [Key in keyof EditorialInput]: string | null
}

function read(rel: string) {
  return readFileSync(path.join(root, rel), "utf8")
}

function readOptional(rel: string) {
  try {
    return read(rel)
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "ENOENT"
    ) {
      return ""
    }
    throw error
  }
}

function columnClause(sql: string, column: string) {
  return sql.match(new RegExp(`\\b${column}\\b[^,;]*`, "i"))?.[0] ?? ""
}

function walkFiles(relDir: string): string[] {
  const abs = path.join(root, relDir)
  let entries: string[]
  try {
    entries = readdirSync(abs)
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "ENOENT"
    ) {
      return []
    }
    throw error
  }
  const files: string[] = []
  for (const entry of entries) {
    const rel = `${relDir}/${entry}`.replaceAll("\\", "/")
    const absEntry = path.join(abs, entry)
    if (statSync(absEntry).isDirectory()) {
      files.push(...walkFiles(rel))
      continue
    }
    files.push(rel)
  }
  return files
}

function blockInner(markup: string, testId: string) {
  const match = markup.match(
    new RegExp(`data-testid="${testId}"[^>]*>([\\s\\S]*?)</`),
  )
  return match?.[1] ?? null
}

const PHONE_NUMBER = "+33 1 86 47 20 19"
const ADDRESS = "12 Rue des Martyrs, 75009 Paris"
const HOURS_OPEN = "12:00"
const HOURS_CLOSE = "22:30"
const PHONE_ICON_PATH = "M13.832 16.568"
const PHONE_LABELS = [
  "Phone",
  "Téléphone",
  "Reservations",
  "Réservations",
  "Reservation phone",
  "Téléphone de réservation",
] as const
const PHONE_PLACEHOLDERS = [
  "+1 (503) 555-0100",
  "+33 6 12 34 56 78",
  "+1 555 0100",
] as const

type OperatingWindowInput = {
  day_of_week: number
  opens_at: string
  closes_at: string
  is_closed: boolean
}

type PhoneVisibilityProps = SavedEditorial & {
  show_reservation_phone: boolean
  phone: string | null
  address: string
  operating_windows: readonly OperatingWindowInput[]
}

type HeroHoursAddressProps = Omit<PhoneVisibilityProps, "address"> & {
  hero_image_url: string | null
  address: string | null
}

const HERO_URL = "https://cdn.example/reserve-hero.png"

const WINDOWS: readonly OperatingWindowInput[] = [
  {
    day_of_week: 1,
    opens_at: HOURS_OPEN,
    closes_at: "14:30",
    is_closed: false,
  },
  {
    day_of_week: 5,
    opens_at: "19:00",
    closes_at: HOURS_CLOSE,
    is_closed: false,
  },
]

function expectPhoneHidden(markup: string) {
  expect(markup).not.toContain(PHONE_NUMBER)
  expect(markup).not.toContain('data-testid="widget-phone"')
  expect(markup).not.toContain(PHONE_ICON_PATH)
  expect(markup).not.toMatch(/lucide-phone\b/)
  expect(markup).not.toMatch(/href="tel:\s*"/)
  for (const label of PHONE_LABELS) {
    expect(markup).not.toContain(label)
  }
  for (const placeholder of PHONE_PLACEHOLDERS) {
    expect(markup).not.toContain(placeholder)
  }
}

function expectHoursAndAddress(markup: string) {
  expect(markup).toContain('data-testid="widget-hours"')
  expect(markup).toContain('data-testid="widget-address"')
  expect(blockInner(markup, "widget-address")).toContain(ADDRESS)
  const hours = blockInner(markup, "widget-hours")
  expect(hours).toContain(HOURS_OPEN)
  expect(hours).toContain(HOURS_CLOSE)
}

function definesSlotGenerator(source: string) {
  if (/\b(?:generateSlotsForSegments|bookableTimesForDay)\b/.test(source)) {
    return true
  }
  return /function\s+\w*(?:[Ss]lot|[Bb]ookable)\w*\s*\(|(?:const|let)\s+\w*(?:[Ss]lot|[Bb]ookable)\w*\s*=\s*(?:async\s*)?(?:function\b|\([^)]*\)\s*=>|\()/.test(
    source,
  )
}

function hasMdCenteredColumn(source: string) {
  for (const tag of source.matchAll(/<[A-Za-z][\w.]*\b([^>]*)>/g)) {
    const tokens = [
      ...tag[1].matchAll(
        /(?:^|[\s"'`{(])((?:[A-Za-z0-9-]+:)*)(max-w-(?:\[[^\]]+\]|[\w./%-]+)|mx-auto)\b/g,
      ),
    ]
    const hasMaxW = tokens.some((token) => token[2].startsWith("max-w-"))
    const hasMxAuto = tokens.some((token) => token[2] === "mx-auto")
    const fromMd = tokens.some((token) => /(?:^|:)md:/.test(token[1]))
    if (hasMaxW && hasMxAuto && fromMd) return true
  }
  return false
}

describe("standalone reservation widget", () => {
  it("SW-3 super-admin saves editorial fields", async () => {
    const baseline = read("supabase/migrations/00000000000000_baseline.sql")

    for (const column of TEXT_COLUMNS) {
      const clause = columnClause(baseline, column)
      expect(clause).toMatch(new RegExp(`\\b${column}\\s+TEXT\\b`, "i"))
      expect(clause).not.toMatch(/\bNOT\s+NULL\b/i)
    }

    const phone = columnClause(baseline, "show_reservation_phone")
    expect(phone).toMatch(
      /show_reservation_phone\s+BOOLEAN\s+NOT\s+NULL\s+DEFAULT\s+false/i,
    )

    expect(baseline).toContain(
      "REVOKE INSERT, UPDATE, DELETE ON TABLE restaurant_settings FROM anon, authenticated",
    )
    const guestWriteGrants = [
      ...baseline.matchAll(
        /GRANT\s+([^;]*?)\s+ON\s+(?:TABLE\s+)?restaurant_settings\s+TO\s+([^;]+);/gi,
      ),
    ].filter(([, privileges, roles]) => {
      if (!/\b(?:anon|authenticated)\b/i.test(roles)) return false
      return /\b(?:INSERT|UPDATE|DELETE|ALL)\b/i.test(privileges)
    })
    expect(guestWriteGrants.map(([statement]) => statement)).toEqual([])

    const proxy = read("lib/supabase/proxy.ts")
    expect(proxy).toContain('["/admin", "/pos", "/kds"]')
    expect(proxy).toContain('url.pathname = user ? "/" : "/auth/login"')

    const settings = read("app/admin/settings/page.tsx")
    const editor = readOptional("components/staff/widget-page-editor.tsx")
    const editorOnSettings =
      settings.includes('data-testid="widget-page-editor"') ||
      (/widget-page-editor/.test(settings) &&
        editor.includes('data-testid="widget-page-editor"'))
    expect(editorOnSettings).toBe(true)

    const hits: string[] = []
    for (const dir of ["app", "components", "lib"]) {
      for (const rel of walkFiles(dir)) {
        const source = read(rel)
        for (const sentence of EXAMPLE_SENTENCES) {
          if (source.includes(sentence)) hits.push(`${rel}: ${sentence}`)
        }
      }
    }
    expect(hits).toEqual([])

    const actions = (await import("@/app/actions/widget-page")) as {
      updateStandaloneWidgetCopy?: (input: EditorialInput) => Promise<unknown>
    }
    expect(typeof actions.updateStandaloneWidgetCopy).toBe("function")
    const updateStandaloneWidgetCopy = actions.updateStandaloneWidgetCopy!

    const input: EditorialInput = {
      restaurant_display_name: "Chez Camille",
      tagline: "Seasonal table",
      welcome_title: "",
      welcome_message: "   ",
      closing_message: "See you soon",
    }

    mocks.upsert.mockResolvedValue({ error: null })
    mocks.createServiceClient.mockImplementation(() => ({
      from: (table: string) => ({
        upsert: (row: unknown) => mocks.upsert(table, row),
      }),
    }))

    mocks.requireSuperAdminUser.mockResolvedValue(null)
    mocks.upsert.mockClear()
    await updateStandaloneWidgetCopy(input).catch(() => undefined)
    expect(mocks.upsert).not.toHaveBeenCalled()

    mocks.requireSuperAdminUser.mockResolvedValue({ id: "super-admin-1" })
    mocks.requireSuperAdminUser.mockClear()
    mocks.createServiceClient.mockClear()
    mocks.upsert.mockClear()
    await updateStandaloneWidgetCopy(input)
    expect(
      mocks.requireSuperAdminUser.mock.invocationCallOrder[0],
    ).toBeLessThan(mocks.createServiceClient.mock.invocationCallOrder[0]!)
    expect(mocks.upsert).toHaveBeenCalledWith(
      "restaurant_settings",
      expect.objectContaining({
        id: 1,
        restaurant_display_name: "Chez Camille",
        tagline: "Seasonal table",
        welcome_title: null,
        welcome_message: null,
        closing_message: "See you soon",
      }),
    )

    const pageModule =
      (await import("@/components/site/standalone-reserve-page")) as {
        StandaloneReservePage?: (props: SavedEditorial) => ReactElement
      }
    expect(typeof pageModule.StandaloneReservePage).toBe("function")
    const markup = renderToStaticMarkup(
      jsx(pageModule.StandaloneReservePage!, {
        restaurant_display_name: "Chez Camille",
        tagline: "Seasonal table",
        welcome_title: null,
        welcome_message: "   ",
        closing_message: "",
      }),
    )
    expect(blockInner(markup, BLOCK_TEST_ID.restaurant_display_name)).toContain(
      "Chez Camille",
    )
    expect(blockInner(markup, BLOCK_TEST_ID.tagline)).toContain(
      "Seasonal table",
    )
    expect(markup).not.toContain(`data-testid="${BLOCK_TEST_ID.welcome_title}"`)
    expect(markup).not.toContain(
      `data-testid="${BLOCK_TEST_ID.welcome_message}"`,
    )
    expect(markup).not.toContain(
      `data-testid="${BLOCK_TEST_ID.closing_message}"`,
    )
  })

  it("SW-6 phone hidden unless flag and number", async () => {
    const baseline = read("supabase/migrations/00000000000000_baseline.sql")
    const phoneColumn = columnClause(baseline, "show_reservation_phone")
    expect(phoneColumn).toMatch(
      /show_reservation_phone\s+BOOLEAN\s+NOT\s+NULL\s+DEFAULT\s+false/i,
    )

    const pageModule =
      (await import("@/components/site/standalone-reserve-page")) as {
        StandaloneReservePage?: (props: PhoneVisibilityProps) => ReactElement
      }
    expect(typeof pageModule.StandaloneReservePage).toBe("function")

    function renderPage(show_reservation_phone: boolean, phone: string | null) {
      return renderToStaticMarkup(
        jsx(pageModule.StandaloneReservePage!, {
          restaurant_display_name: null,
          tagline: null,
          welcome_title: null,
          welcome_message: null,
          closing_message: null,
          show_reservation_phone,
          phone,
          address: ADDRESS,
          operating_windows: WINDOWS,
        }),
      )
    }

    const flagOff = renderPage(false, PHONE_NUMBER)
    const phoneNull = renderPage(true, null)
    const phoneBlank = renderPage(true, "   ")
    const shown = renderPage(true, PHONE_NUMBER)

    expectPhoneHidden(flagOff)
    expectPhoneHidden(phoneNull)
    expectPhoneHidden(phoneBlank)

    expect(shown).toContain(PHONE_NUMBER)
    expect(blockInner(shown, "widget-phone")).toContain(PHONE_NUMBER)

    for (const markup of [flagOff, phoneNull, phoneBlank, shown]) {
      expectHoursAndAddress(markup)
    }
  })

  it("SW-4 name is display name or nothing", async () => {
    const pageModule =
      (await import("@/components/site/standalone-reserve-page")) as {
        StandaloneReservePage?: (props: SavedEditorial) => ReactElement
      }
    expect(typeof pageModule.StandaloneReservePage).toBe("function")

    const otherCopy = {
      tagline: null,
      welcome_title: null,
      welcome_message: null,
      closing_message: null,
    } as const

    const named = renderToStaticMarkup(
      jsx(pageModule.StandaloneReservePage!, {
        ...otherCopy,
        restaurant_display_name: "  Maison Laurent  ",
      }),
    )
    expect(blockInner(named, BLOCK_TEST_ID.restaurant_display_name)).toBe(
      "Maison Laurent",
    )

    for (const restaurant_display_name of [null, "", "   "] as const) {
      const markup = renderToStaticMarkup(
        jsx(pageModule.StandaloneReservePage!, {
          ...otherCopy,
          restaurant_display_name,
        }),
      )
      expect(markup).not.toContain(
        `data-testid="${BLOCK_TEST_ID.restaurant_display_name}"`,
      )
      expect(markup).not.toContain("Restaurant Link")
    }
  })

  it("SW-1 public reserve page centers the widget", () => {
    const rel = "app/[locale]/reserve/page.tsx"
    expect(rel.split("/")).not.toContain("admin")

    const source = readOptional(rel)
    expect(source).toMatch(
      /data-testid="standalone-reserve"[\s\S]*<ReservationWidget\b/,
    )
    expect(definesSlotGenerator(source)).toBe(false)
    expect(source).not.toMatch(/\bmd:grid-cols-2\b/)
    expect(hasMdCenteredColumn(source)).toBe(true)
  })

  it("SW-5 hero hours and address", async () => {
    const pageModule =
      (await import("@/components/site/standalone-reserve-page")) as {
        StandaloneReservePage?: (props: HeroHoursAddressProps) => ReactElement
      }
    expect(typeof pageModule.StandaloneReservePage).toBe("function")

    const copy = {
      restaurant_display_name: null,
      tagline: null,
      welcome_title: null,
      welcome_message: null,
      closing_message: null,
      show_reservation_phone: false,
      phone: null,
    } as const

    function renderPage(hero_image_url: string | null, address: string | null) {
      return renderToStaticMarkup(
        jsx(pageModule.StandaloneReservePage!, {
          ...copy,
          hero_image_url,
          address,
          operating_windows: WINDOWS,
        }),
      )
    }

    function heroImg(markup: string) {
      return markup
        .match(/<img\b[^>]*>/g)
        ?.find((tag) => tag.includes('data-testid="widget-hero"'))
    }

    const shown = renderPage(HERO_URL, ADDRESS)
    const hours = blockInner(shown, "widget-hours")
    for (const row of WINDOWS) {
      expect(hours).toContain(row.opens_at)
      expect(hours).toContain(row.closes_at)
    }
    expect(blockInner(shown, "widget-address")).toContain(ADDRESS)

    const omitted = renderPage(null, null)
    expect(omitted).not.toContain('data-testid="widget-address"')

    expect(heroImg(shown) ?? "").toContain(`src="${HERO_URL}"`)
    expect(heroImg(omitted)).toBeUndefined()
  })

  it("SW-2 existing widget accordions stay", () => {
    const page = read("app/[locale]/reserve/page.tsx")
    for (const id of ["guests", "date", "time"] as const) {
      expect(page).not.toContain(`data-testid="${id}"`)
    }

    const widget = read("components/site/reservation-widget.tsx")
    const guestsAt = widget.indexOf('data-testid="guests"')
    const dateAt = widget.indexOf('data-testid="date"')
    const timeAt = widget.indexOf('data-testid="time"')
    expect(guestsAt).toBeGreaterThanOrEqual(0)
    expect(dateAt).toBeGreaterThan(guestsAt)
    expect(timeAt).toBeGreaterThan(dateAt)
    expect(widget).toContain('data-testid="slot-card"')
    expect(widget).toContain('data-testid="slot-group"')

    expect(page).toMatch(/<StandaloneReservePage\b/)
    expect(page).toMatch(/<ReservationWidget\b/)
  })

  it("SW-3 settings editor submits editorial fields and the phone flag", async () => {
    const settings = read("app/admin/settings/page.tsx")
    const editorFile = readOptional("components/staff/widget-page-editor.tsx")
    const editorSurface = editorFile.length > 0 ? editorFile : settings

    expect(
      settings.includes('data-testid="widget-page-editor"') ||
        /widget-page-editor/.test(settings),
    ).toBe(true)
    expect(editorSurface).toContain('data-testid="widget-page-editor"')
    expect(editorSurface).toContain("updateStandaloneWidgetCopy")
    for (const field of [...TEXT_COLUMNS, "show_reservation_phone"] as const) {
      expect(editorSurface).toContain(field)
    }

    const actions = (await import("@/app/actions/widget-page")) as {
      updateStandaloneWidgetCopy?: (input: EditorialInput) => Promise<unknown>
    }
    expect(typeof actions.updateStandaloneWidgetCopy).toBe("function")
    const updateStandaloneWidgetCopy = actions.updateStandaloneWidgetCopy! as (
      input: EditorialInput & { show_reservation_phone: boolean },
    ) => Promise<unknown>

    mocks.upsert.mockResolvedValue({ error: null })
    mocks.createServiceClient.mockImplementation(() => ({
      from: (table: string) => ({
        upsert: (row: unknown) => mocks.upsert(table, row),
      }),
    }))
    mocks.requireSuperAdminUser.mockResolvedValue({ id: "super-admin-1" })
    mocks.upsert.mockClear()

    await updateStandaloneWidgetCopy({
      restaurant_display_name: "Chez Camille",
      tagline: "Seasonal table",
      welcome_title: "Welcome",
      welcome_message: "Come in",
      closing_message: "See you soon",
      show_reservation_phone: true,
    })

    expect(mocks.upsert).toHaveBeenCalledWith(
      "restaurant_settings",
      expect.objectContaining({
        id: 1,
        show_reservation_phone: true,
      }),
    )
  })
})
