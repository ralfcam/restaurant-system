import { readFileSync } from "node:fs"
import path from "node:path"
import { jsx } from "react/jsx-runtime"
import { renderToStaticMarkup } from "react-dom/server"
import { NextIntlClientProvider } from "next-intl"
import { beforeEach, describe, expect, it, vi } from "vitest"
import en from "@/messages/en.json"
import type { ReservationRow } from "@/app/actions/reservations"
import { ReservationsManager } from "@/components/staff/reservations-manager"
import {
  validateReservationPayload,
  type ReservationPayload,
} from "@/lib/reservations/validation"

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  today: vi.fn(() => "2026-08-18"),
  nowTime: vi.fn(() => "10:00"),
  from: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  isDateBlocked: vi.fn(),
  getOperatingWindowForDate: vi.fn(),
  sendBookingConfirmation: vi.fn(),
  requireStaffUser: vi.fn(),
}))

vi.mock("@/app/actions/availability", () => ({
  isDateBlocked: mocks.isDateBlocked,
  getOperatingWindowForDate: mocks.getOperatingWindowForDate,
}))

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}))

vi.mock("@/lib/timezone", () => ({
  getTodayInRestaurantTZ: mocks.today,
  getNowTimeInRestaurantTZ: mocks.nowTime,
}))

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({ from: mocks.from }),
}))

vi.mock("@/lib/supabase/client-server", () => ({
  createClient: () => ({ from: mocks.from }),
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: "staff-1" } } }) },
  }),
}))

vi.mock("@/lib/supabase/require-staff", () => ({
  requireStaffUser: (...args: unknown[]) => mocks.requireStaffUser(...args),
}))

vi.mock("@/lib/marketing/booking-confirmation", () => ({
  sendBookingConfirmation: mocks.sendBookingConfirmation,
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: () => undefined,
    refresh: () => undefined,
  }),
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`)
  },
}))

const dinnerWindow = {
  day_of_week: 2,
  is_closed: false,
  segments: [
    { label: "Dinner", opens_at: "18:00", closes_at: "22:00", sort_order: 0 },
  ],
}

type QueryResult = { data: null; error: null }

function reservationTable() {
  const resolved = Promise.resolve<QueryResult>({ data: null, error: null })
  const chain = {
    insert(row: Record<string, unknown>) {
      mocks.insert(row)
      return resolved
    },
    update(patch: Record<string, unknown>) {
      mocks.update(patch)
      return chain
    },
    delete() {
      return chain
    },
    select() {
      return chain
    },
    eq() {
      return chain
    },
    match() {
      return chain
    },
    then(
      onFulfilled: (value: QueryResult) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) {
      return resolved.then(onFulfilled, onRejected)
    },
  }
  return chain
}

function persistedAllergenValues() {
  const rows = [
    ...mocks.insert.mock.calls.map((call) => call[0]),
    ...mocks.update.mock.calls.map((call) => call[0]),
  ]
  return rows.filter(
    (row): row is { allergens: unknown } =>
      !!row && typeof row === "object" && "allergens" in row,
  )
}

describe("allergen capture", () => {
  beforeEach(() => {
    mocks.revalidatePath.mockReset()
    mocks.from.mockReset()
    mocks.insert.mockReset()
    mocks.update.mockReset()
    mocks.isDateBlocked.mockReset()
    mocks.getOperatingWindowForDate.mockReset()
    mocks.today.mockReturnValue("2026-08-18")
    mocks.nowTime.mockReturnValue("10:00")
    mocks.isDateBlocked.mockResolvedValue(false)
    mocks.getOperatingWindowForDate.mockResolvedValue(dinnerWindow)
    mocks.from.mockImplementation(() => reservationTable())
    mocks.sendBookingConfirmation.mockReset()
    mocks.sendBookingConfirmation.mockResolvedValue(undefined)
    mocks.requireStaffUser.mockReset()
  })

  it("AL-1 guest field stores null when blank", async () => {
    const widget = readFileSync(
      path.join(process.cwd(), "components/site/reservation-widget.tsx"),
      "utf8",
    )
    const guestDetailsAt = widget.search(/step === 2\b/)
    expect(guestDetailsAt).toBeGreaterThanOrEqual(0)
    const guestDetails = widget.slice(guestDetailsAt)
    expect(guestDetails).toMatch(
      /data-testid=["']reservation-allergens-input["']/,
    )
    const control = guestDetails.match(
      /<[^>]*data-testid=["']reservation-allergens-input["'][^>]*>/,
    )
    expect(control).not.toBeNull()
    expect(control?.[0]).not.toMatch(/\brequired\b/)

    const payload: ReservationPayload & { allergens: string } = {
      guestName: "Amelia Brooks",
      partySize: 2,
      date: "2026-08-25",
      time: "18:30",
      phone: "",
      email: "guest@test.local",
      allergens: "",
    }
    const { createReservation } = await import("@/app/actions/reservations")
    const result = await createReservation(payload)

    expect(result.error).toBeUndefined()
    expect(result.confCode).toMatch(/^TVL-\d{4}$/)
    expect(persistedAllergenValues()).toEqual(
      expect.arrayContaining([expect.objectContaining({ allergens: null })]),
    )
  })

  it("AL-2 trimmed service-role write and rollback", async () => {
    const baseline = readFileSync(
      path.join(
        process.cwd(),
        "supabase/migrations/00000000000000_baseline.sql",
      ),
      "utf8",
    )
    const guestGrants = baseline.match(
      /GRANT INSERT \(([^)]+)\) ON TABLE reservations TO anon, authenticated/g,
    )
    expect(guestGrants).not.toBeNull()
    expect(guestGrants?.join("\n")).not.toMatch(/\ballergens\b/)

    type Filter = { column: string; value: unknown }
    type Op = {
      kind: "insert" | "update" | "delete"
      payload?: Record<string, unknown>
      filters: Filter[]
    }

    function trackReservations(failAllergenUpdate: boolean) {
      const ops: Op[] = []
      mocks.from.mockImplementation(() => {
        const filters: Filter[] = []
        let result: Promise<{
          data: null
          error: { message: string; code: string } | null
        }> = Promise.resolve({ data: null, error: null })
        const chain = {
          insert(row: Record<string, unknown>) {
            mocks.insert(row)
            ops.push({ kind: "insert", payload: row, filters })
            return chain
          },
          update(patch: Record<string, unknown>) {
            mocks.update(patch)
            if (failAllergenUpdate) {
              result = Promise.resolve({
                data: null,
                error: { message: "allergens write failed", code: "XX000" },
              })
            }
            ops.push({ kind: "update", payload: patch, filters })
            return chain
          },
          delete() {
            ops.push({ kind: "delete", filters })
            return chain
          },
          select() {
            return chain
          },
          eq(column: string, value: unknown) {
            filters.push({ column, value })
            return chain
          },
          match(query: Record<string, unknown>) {
            for (const [column, value] of Object.entries(query)) {
              filters.push({ column, value })
            }
            return chain
          },
          then(
            onFulfilled: (value: {
              data: null
              error: { message: string; code: string } | null
            }) => unknown,
            onRejected?: (reason: unknown) => unknown,
          ) {
            return result.then(onFulfilled, onRejected)
          },
        }
        return chain
      })
      return ops
    }

    const base = {
      guestName: "Amelia Brooks",
      partySize: 2,
      date: "2026-08-25",
      time: "18:30",
      phone: "",
      email: "guest@test.local",
    }
    const trimmed = "sesame"
    const { createReservation } = await import("@/app/actions/reservations")

    const savedOps = trackReservations(false)
    const saved = await createReservation({
      ...base,
      allergens: `  ${trimmed}  `,
    })
    expect(saved.error).toBeUndefined()
    expect(saved.confCode).toMatch(/^TVL-\d{4}$/)
    const savedInsert = savedOps.filter((op) => op.kind === "insert")
    expect(savedInsert).toHaveLength(1)
    expect(savedInsert[0]?.payload).not.toHaveProperty("allergens")
    expect(savedInsert[0]?.payload?.conf_code).toBe(saved.confCode)
    expect(savedOps.filter((op) => op.kind === "update")).toEqual([
      {
        kind: "update",
        payload: { allergens: trimmed },
        filters: [{ column: "conf_code", value: saved.confCode }],
      },
    ])
    expect(trimmed.length).toBeLessThanOrEqual(500)

    const atCap = "n".repeat(500)
    const capOps = trackReservations(false)
    const capped = await createReservation({ ...base, allergens: atCap })
    expect(capped.error).toBeUndefined()
    expect(capped.confCode).toMatch(/^TVL-\d{4}$/)
    expect(
      capOps.filter((op) => op.kind === "insert")[0]?.payload,
    ).not.toHaveProperty("allergens")
    expect(capOps.filter((op) => op.kind === "update")).toEqual([
      {
        kind: "update",
        payload: { allergens: atCap },
        filters: [{ column: "conf_code", value: capped.confCode }],
      },
    ])
    expect(atCap.length).toBe(500)

    const refusedOps = trackReservations(false)
    mocks.insert.mockClear()
    const refused = await createReservation({
      ...base,
      allergens: "x".repeat(501),
    })
    expect(refused.confCode).toBe("")
    expect(refused.error).toEqual(expect.any(String))
    expect(refused.error).not.toBe("")
    expect(mocks.insert).not.toHaveBeenCalled()
    expect(refusedOps.filter((op) => op.kind === "insert")).toHaveLength(0)

    const failedOps = trackReservations(true)
    const failed = await createReservation({
      ...base,
      allergens: `  ${trimmed}  `,
    })
    expect(failed.confCode).toBe("")
    expect(failed.error).toEqual(expect.any(String))
    expect(failed.error).not.toBe("")
    const failedInsert = failedOps.filter((op) => op.kind === "insert")
    expect(failedInsert).toHaveLength(1)
    expect(failedInsert[0]?.payload).not.toHaveProperty("allergens")
    const failedCode = failedInsert[0]?.payload?.conf_code
    expect(failedOps.filter((op) => op.kind === "update")).toEqual([
      {
        kind: "update",
        payload: { allergens: trimmed },
        filters: [{ column: "conf_code", value: failedCode }],
      },
    ])
    expect(failedOps.filter((op) => op.kind === "delete")).toEqual([
      {
        kind: "delete",
        filters: [{ column: "conf_code", value: failedCode }],
      },
    ])
  })

  it("AL-3 staff row shows allergens", () => {
    const page = readFileSync(
      path.join(process.cwd(), "app/admin/reservations/page.tsx"),
      "utf8",
    )
    expect(page).toMatch(
      /import\s*\{[^}]*ReservationsManager[^}]*\}\s*from\s*["']@\/components\/staff\/reservations-manager["']/,
    )
    expect(page).toMatch(/<ReservationsManager\b/)

    const manager = readFileSync(
      path.join(process.cwd(), "components/staff/reservations-manager.tsx"),
      "utf8",
    )
    const mapAt = manager.indexOf("filtered.map((r)")
    expect(mapAt).toBeGreaterThanOrEqual(0)
    const listEnd = manager.indexOf("</ul>", mapAt)
    expect(listEnd).toBeGreaterThan(mapAt)
    const row = manager.slice(mapAt, listEnd)

    expect(row).toMatch(/\{r\.guestName\}/)
    expect(row).toMatch(/\{r\.time\}/)
    expect(row).toMatch(/\{r\.partySize\}/)

    expect(row).toMatch(
      /r\.allergens\s*(?:\?|&&|!==?\s*null)[\s\S]{0,500}data-testid=["']reservation-allergens["'][\s\S]{0,300}\{r\.allergens\}/,
    )
    const shown = row.match(
      /r\.allergens\s*(?:\?|&&|!==?\s*null)[\s\S]{0,500}data-testid=["']reservation-allergens["'][\s\S]{0,300}\{r\.allergens\}/,
    )
    expect(shown?.[0]).not.toMatch(/\{r\.guestName\}/)
    expect(shown?.[0]).not.toMatch(/\{r\.time\}/)
    expect(shown?.[0]).not.toMatch(/\{r\.partySize\}/)

    expect(manager).toMatch(/allergens:\s*r\.allergens\b/)
  })

  it("AL-4 allergen text stays on its reservation", () => {
    const email = "shared-guest@test.local"
    const firstAllergens = "allergen-sesame"
    const secondAllergens = "allergen-peanut"
    const base: ReservationRow = {
      id: "res-shared",
      guest_name: "Amelia Brooks",
      party_size: 2,
      date: "2026-08-25",
      time: "18:30",
      status: "confirmed",
      phone: "555-0100",
      email,
      notes: null,
      table_label: null,
      conf_code: "TVL-4100",
      created_at: "2026-08-18T10:00:00Z",
      allergens: firstAllergens,
    }
    const first: ReservationRow = {
      ...base,
      id: "res-sesame",
      conf_code: "TVL-4101",
      allergens: firstAllergens,
    }
    const second: ReservationRow = {
      ...base,
      id: "res-peanut",
      time: "19:00",
      party_size: 4,
      phone: "555-0199",
      conf_code: "TVL-4102",
      allergens: secondAllergens,
    }

    const markup = renderToStaticMarkup(
      jsx(NextIntlClientProvider, {
        locale: "en",
        messages: en,
        timeZone: "Europe/Zurich",
        children: jsx(ReservationsManager, {
          initialReservations: [first, second],
          selectedDate: "2026-08-25",
          today: "2026-08-18",
          occupancyWindow: {
            occupancyDurationMinutes: 90,
            safetyBufferMinutes: 15,
          },
        }),
      }),
    )

    const staffRows = [...markup.matchAll(/<li\b[^>]*>[\s\S]*?<\/li>/g)]
      .map((match) => match[0])
      .filter((row) => row.includes(email))
    expect(staffRows).toHaveLength(2)

    function allergenText(row: string): string {
      const node = row.match(
        /data-testid="reservation-allergens"[^>]*>([^<]*)<\/p>/,
      )
      expect(node).not.toBeNull()
      return node?.[1] ?? ""
    }

    expect(allergenText(staffRows[0]!)).toBe(first.allergens)
    expect(allergenText(staffRows[1]!)).toBe(second.allergens)
    expect(staffRows[0]).not.toContain(second.allergens)
    expect(staffRows[1]).not.toContain(first.allergens)
  })

  it("AL-5 completed transition leaves allergens", async () => {
    const actions = (await import("@/app/actions/reservations")) as {
      transitionReservationStatus?: (
        reservationId: string,
        nextStatus: "completed",
      ) => Promise<{ error?: string }>
    }
    expect(typeof actions.transitionReservationStatus).toBe("function")
    const transitionReservationStatus =
      actions.transitionReservationStatus as NonNullable<
        typeof actions.transitionReservationStatus
      >

    mocks.requireStaffUser.mockResolvedValue({
      id: "staff-1",
      app_metadata: { role: "super_admin" },
    })

    type StoredReservation = {
      id: string
      status: "seated" | "completed"
      table_label: string | null
      allergens: string | null
    }

    for (const allergens of [null, "sesame"] as const) {
      const reservationId =
        allergens === null ? "res-allergens-null" : "res-allergens-set"
      const row: StoredReservation = {
        id: reservationId,
        status: "seated",
        table_label: null,
        allergens,
      }

      mocks.from.mockImplementation((table: string) => {
        if (table === "reservations") {
          return {
            select: () => ({
              eq: () => ({
                single: async () => ({
                  data: { ...row },
                  error: null,
                }),
              }),
            }),
            update: (patch: Record<string, unknown>) => {
              const recorded = { eq: [] as unknown[][] }
              const chain = {
                eq: (...args: unknown[]) => {
                  recorded.eq.push(args)
                  if (args[0] === "id" && args[1] === reservationId) {
                    Object.assign(row, patch)
                  }
                  return chain
                },
                then: (
                  resolve: (value: unknown) => unknown,
                  reject?: (reason: unknown) => unknown,
                ) => Promise.resolve({ error: null }).then(resolve, reject),
              }
              return chain
            },
          }
        }
        return {
          insert: async () => ({ error: null }),
        }
      })

      const result = await transitionReservationStatus(
        reservationId,
        "completed",
      )
      expect(result).toEqual({})
      expect(row.status).toBe("completed")
      expect(row.allergens).toBe(allergens)
    }
  })

  it("AL-6 guest validation and confirmation stay", async () => {
    const today = "2026-08-18"
    const valid: ReservationPayload = {
      guestName: "Amelia Brooks",
      partySize: 2,
      date: "2026-08-25",
      time: "18:30",
      phone: "",
      email: "guest@test.local",
    }

    expect(validateReservationPayload({ ...valid, guestName: "" }, today)).toBe(
      "errors.reservation.nameRequired",
    )
    expect(
      validateReservationPayload({ ...valid, email: "not-an-email" }, today),
    ).toBe("errors.reservation.emailInvalid")
    expect(validateReservationPayload({ ...valid, partySize: 9 }, today)).toBe(
      "errors.reservation.partyTooLarge",
    )

    const { createReservation } = await import("@/app/actions/reservations")
    const result = await createReservation(valid)

    expect(result.error).toBeUndefined()
    expect(result.confCode).toMatch(/^TVL-\d{4}$/)
    expect(mocks.sendBookingConfirmation).toHaveBeenCalledTimes(1)
    expect(mocks.sendBookingConfirmation).toHaveBeenCalledWith(
      expect.objectContaining({
        email: valid.email,
        confCode: result.confCode,
        guestName: valid.guestName,
        date: valid.date,
        time: valid.time,
        partySize: valid.partySize,
      }),
    )
  })
})
