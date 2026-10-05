import { readFileSync } from "node:fs"
import path from "node:path"
import { beforeEach, describe, expect, it, vi } from "vitest"
import * as guestProfiles from "@/lib/guest-profiles"
import { dateTimeToUTC } from "@/lib/timezone"

const mocks = vi.hoisted(() => ({
  requireStaffUser: vi.fn(),
  createServiceClient: vi.fn(),
  from: vi.fn(),
}))

vi.mock("@/lib/supabase/require-staff", () => ({
  requireStaffUser: mocks.requireStaffUser,
}))

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: (...args: unknown[]) =>
    mocks.createServiceClient(...args),
}))

vi.mock("next/cache", () => ({
  revalidatePath: () => undefined,
}))

type Row = Record<string, unknown>

type GuestProfileActions = {
  getGuestProfile: (email: string) => Promise<{ error?: string }>
}

function thenable<T>(value: T) {
  const builder: Record<string, unknown> = {}
  const self = new Proxy(builder, {
    get(_target, prop) {
      if (prop === "then") {
        return (
          resolve: (value: T) => unknown,
          reject?: (reason: unknown) => unknown,
        ) => Promise.resolve(value).then(resolve, reject)
      }
      if (prop === "single" || prop === "maybeSingle") {
        const payload = value as { data: Row | Row[] | null; error: unknown }
        const row = Array.isArray(payload.data)
          ? (payload.data[0] ?? null)
          : payload.data
        return async () => ({ data: row, error: row ? null : payload.error })
      }
      return () => self
    },
  })
  return self
}

const root = process.cwd()
const proxySource = path.join(root, "lib/supabase/proxy.ts")
const panelSource = path.join(root, "components/staff/guest-profile-panel.tsx")
const baselineSource = path.join(
  root,
  "supabase/migrations/00000000000000_baseline.sql",
)
const isoTimestamp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/

describe("guest incident ficha", () => {
  beforeEach(() => {
    mocks.requireStaffUser.mockReset()
    mocks.createServiceClient.mockReset()
    mocks.from.mockReset()
    mocks.from.mockImplementation(() => thenable({ data: [], error: null }))
    mocks.createServiceClient.mockReturnValue({ from: mocks.from })
  })

  it("staff ficha lists incidents and anonymous /admin follows the login redirect", async () => {
    const actions =
      (await import("@/app/actions/guest-profiles")) as GuestProfileActions

    mocks.requireStaffUser.mockResolvedValue(null)
    mocks.createServiceClient.mockClear()
    const unauthorized = await actions.getGuestProfile("Ada@Ex.com")
    expect(unauthorized).toEqual({
      error: "errors.guestProfiles.unauthorized",
    })
    expect(mocks.createServiceClient).not.toHaveBeenCalled()

    mocks.requireStaffUser.mockResolvedValue({ id: "staff-1" })
    mocks.createServiceClient.mockClear()
    await actions.getGuestProfile("Ada@Ex.com")
    expect(mocks.createServiceClient).toHaveBeenCalled()

    const proxy = readFileSync(proxySource, "utf8")
    expect(proxy).toContain('user ? "/" : "/auth/login"')

    const panel = readFileSync(panelSource, "utf8")
    expect(panel).toContain('data-testid="guest-incidents"')
    const incidentsRegion =
      panel.match(/data-testid="guest-incidents"[\s\S]*/)?.[0] ?? ""
    expect(incidentsRegion).toMatch(/\bincident\.type\b/)
    expect(incidentsRegion).toMatch(/\bincident\.date\b/)
  })

  it("cancel stamps cancelled_at and only a late cancel is a late_cancel incident", async () => {
    const baseline = readFileSync(baselineSource, "utf8")
    expect(baseline).toContain("cancelled_at TIMESTAMPTZ")
    expect(baseline).toContain("ADD COLUMN IF NOT EXISTS cancelled_at")
    const guestInsert = baseline.match(
      /GRANT INSERT \(([^)]+)\) ON TABLE reservations TO anon, authenticated/,
    )
    expect(guestInsert).not.toBeNull()
    expect(
      guestInsert?.[1]?.split(",").map((column) => column.trim()),
    ).not.toContain("cancelled_at")

    const actions = (await import("@/app/actions/reservations")) as {
      transitionReservationStatus?: (
        reservationId: string,
        nextStatus: "cancelled",
      ) => Promise<{ error?: string }>
    }
    expect(typeof actions.transitionReservationStatus).toBe("function")
    const transitionReservationStatus =
      actions.transitionReservationStatus as NonNullable<
        typeof actions.transitionReservationStatus
      >

    const reservationId = "res-cancel-1"
    const updates: {
      table: string
      patch: Record<string, unknown>
      eq: unknown[][]
    }[] = []

    function recordUpdate(table: string) {
      return (patch: Record<string, unknown>) => {
        const recorded = { table, patch, eq: [] as unknown[][] }
        updates.push(recorded)
        const chain = {
          eq: (...args: unknown[]) => {
            recorded.eq.push(args)
            return chain
          },
          then: (
            resolve: (value: unknown) => unknown,
            reject?: (reason: unknown) => unknown,
          ) => Promise.resolve({ error: null }).then(resolve, reject),
        }
        return chain
      }
    }

    mocks.requireStaffUser.mockResolvedValue({ id: "staff-1" })
    mocks.from.mockImplementation((table: string) => {
      if (table === "reservations") {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: { status: "confirmed", table_label: null },
                error: null,
              }),
            }),
          }),
          update: recordUpdate(table),
        }
      }
      return thenable({ data: null, error: null })
    })

    const result = await transitionReservationStatus(reservationId, "cancelled")
    expect(result).toEqual({})
    const reservationUpdate = updates.find(
      (update) => update.table === "reservations",
    )
    expect(reservationUpdate?.patch).toMatchObject({ status: "cancelled" })
    expect(reservationUpdate?.patch.cancelled_at).toEqual(
      expect.stringMatching(isoTimestamp),
    )

    expect(typeof guestProfiles.deriveGuestIncidents).toBe("function")
    const deriveGuestIncidents = guestProfiles.deriveGuestIncidents as (
      rows: {
        status: string
        date: string
        time: string
        cancelled_at: string | null
      }[],
    ) => { type: string; date: string }[]

    const start = dateTimeToUTC("2026-06-15", "19:00")
    const lateAt = new Date(start.getTime() - 24 * 60 * 60 * 1000).toISOString()
    const earlyAt = new Date(
      start.getTime() - 24 * 60 * 60 * 1000 - 1,
    ).toISOString()
    const row = (cancelled_at: string | null) => ({
      status: "cancelled",
      date: "2026-06-15",
      time: "19:00",
      cancelled_at,
    })

    expect(deriveGuestIncidents([row(lateAt)])).toEqual([
      { type: "late_cancel", date: "2026-06-15" },
    ])
    expect(deriveGuestIncidents([row(earlyAt)])).toEqual([])
    expect(deriveGuestIncidents([row(null)])).toEqual([])
  })

  it("seat and walk-in stamp seated_at and only a late seat is a delay", async () => {
    const baseline = readFileSync(baselineSource, "utf8")
    expect(baseline).toContain("seated_at TIMESTAMPTZ")
    expect(baseline).toContain("ADD COLUMN IF NOT EXISTS seated_at")
    const guestInsert = baseline.match(
      /GRANT INSERT \(([^)]+)\) ON TABLE reservations TO anon, authenticated/,
    )
    expect(guestInsert).not.toBeNull()
    expect(
      guestInsert?.[1]?.split(",").map((column) => column.trim()),
    ).not.toContain("seated_at")

    const actions = (await import("@/app/actions/reservations")) as {
      transitionReservationStatus?: (
        reservationId: string,
        nextStatus: "seated" | "completed",
      ) => Promise<{ error?: string }>
      seatWalkIn?: (input: {
        table_label: string
        party_size: number
      }) => Promise<{ error?: string }>
    }
    expect(typeof actions.transitionReservationStatus).toBe("function")
    expect(typeof actions.seatWalkIn).toBe("function")
    const transitionReservationStatus =
      actions.transitionReservationStatus as NonNullable<
        typeof actions.transitionReservationStatus
      >
    const seatWalkIn = actions.seatWalkIn as NonNullable<
      typeof actions.seatWalkIn
    >

    const reservationId = "res-seat-1"
    const updates: {
      table: string
      patch: Record<string, unknown>
      eq: unknown[][]
    }[] = []

    function recordUpdate(table: string) {
      return (patch: Record<string, unknown>) => {
        const recorded = { table, patch, eq: [] as unknown[][] }
        updates.push(recorded)
        const chain = {
          eq: (...args: unknown[]) => {
            recorded.eq.push(args)
            return chain
          },
          then: (
            resolve: (value: unknown) => unknown,
            reject?: (reason: unknown) => unknown,
          ) => Promise.resolve({ error: null }).then(resolve, reject),
        }
        return chain
      }
    }

    const reads = [
      { status: "confirmed", table_label: "4" },
      { status: "seated", table_label: "4" },
    ]
    let readIndex = 0
    mocks.requireStaffUser.mockResolvedValue({ id: "staff-1" })
    mocks.from.mockImplementation((table: string) => {
      if (table === "reservations") {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: reads[readIndex++] ?? null,
                error: null,
              }),
            }),
          }),
          update: recordUpdate(table),
        }
      }
      return thenable({ data: null, error: null })
    })

    await transitionReservationStatus(reservationId, "seated")
    const seatedUpdate = updates.find(
      (update) => update.patch.status === "seated",
    )
    expect(seatedUpdate?.patch.seated_at).toEqual(
      expect.stringMatching(isoTimestamp),
    )
    expect(seatedUpdate?.patch.table_label).not.toBe(null)

    await transitionReservationStatus(reservationId, "completed")
    const completedUpdate = updates.find(
      (update) => update.patch.status === "completed",
    )
    expect(completedUpdate?.patch).toEqual(
      expect.not.objectContaining({ seated_at: null }),
    )

    const inserted: Record<string, unknown>[] = []
    function recordingThenable(value: { data: unknown; error: unknown }) {
      const base = thenable(value)
      return new Proxy(base as object, {
        get(target, prop, receiver) {
          if (prop === "insert") {
            return (payload: Record<string, unknown>) => {
              inserted.push(payload)
              return thenable({ data: null, error: null })
            }
          }
          return Reflect.get(target, prop, receiver)
        },
      })
    }

    mocks.from.mockImplementation((table: string) => {
      if (table === "tables") {
        return recordingThenable({
          data: { label: "4", seats: 4 },
          error: null,
        })
      }
      if (table === "restaurant_settings") {
        return recordingThenable({
          data: {
            occupancy_duration_minutes: 90,
            safety_buffer_minutes: 15,
          },
          error: null,
        })
      }
      return recordingThenable({ data: [], error: null })
    })

    await seatWalkIn({ table_label: "4", party_size: 2 })
    expect(inserted[0]?.seated_at).toEqual(expect.stringMatching(isoTimestamp))

    expect(typeof guestProfiles.deriveGuestIncidents).toBe("function")
    const deriveGuestIncidents = guestProfiles.deriveGuestIncidents as (
      rows: {
        status: string
        date: string
        time: string
        seated_at: string
      }[],
    ) => { type: string; date: string }[]

    const start = dateTimeToUTC("2026-06-15", "19:00")
    const onTime = new Date(start.getTime() + 15 * 60 * 1000).toISOString()
    const late = new Date(start.getTime() + 15 * 60 * 1000 + 1).toISOString()
    const seatRow = (status: "seated" | "completed", seated_at: string) => ({
      status,
      date: "2026-06-15",
      time: "19:00",
      seated_at,
    })

    expect(deriveGuestIncidents([seatRow("seated", onTime)])).toEqual([])
    expect(deriveGuestIncidents([seatRow("seated", late)])).toEqual([
      { type: "delay", date: "2026-06-15" },
    ])
    expect(deriveGuestIncidents([seatRow("completed", late)])).toEqual([
      { type: "delay", date: "2026-06-15" },
    ])
  })

  it("no_show is an incident and confirmed is not", () => {
    expect(typeof guestProfiles.deriveGuestIncidents).toBe("function")
    const deriveGuestIncidents = guestProfiles.deriveGuestIncidents as (
      rows: {
        status: string
        date: string
        time: string
      }[],
    ) => { type: string; date: string }[]

    expect(
      deriveGuestIncidents([
        { status: "no_show", date: "2026-06-15", time: "19:00" },
      ]),
    ).toEqual([{ type: "no_show", date: "2026-06-15" }])
    expect(
      deriveGuestIncidents([
        { status: "confirmed", date: "2026-06-15", time: "19:00" },
      ]),
    ).toEqual([])
  })

  it("each reservation contributes only one incident type", () => {
    expect(typeof guestProfiles.deriveGuestIncidents).toBe("function")
    const deriveGuestIncidents = guestProfiles.deriveGuestIncidents as (
      rows: {
        status: string
        date: string
        time: string
        cancelled_at?: string | null
        seated_at?: string | null
      }[],
    ) => { type: string; date: string }[]

    const start = dateTimeToUTC("2026-06-15", "19:00")
    const lateSeatedAt = new Date(
      start.getTime() + 16 * 60 * 1000,
    ).toISOString()
    const lateCancelAt = new Date(
      start.getTime() - 24 * 60 * 60 * 1000,
    ).toISOString()

    expect(
      deriveGuestIncidents([
        {
          status: "no_show",
          date: "2026-06-15",
          time: "19:00",
          seated_at: lateSeatedAt,
        },
      ]),
    ).toEqual([{ type: "no_show", date: "2026-06-15" }])
    expect(
      deriveGuestIncidents([
        {
          status: "cancelled",
          date: "2026-06-15",
          time: "19:00",
          cancelled_at: lateCancelAt,
          seated_at: lateSeatedAt,
        },
      ]),
    ).toEqual([{ type: "late_cancel", date: "2026-06-15" }])
    expect(
      deriveGuestIncidents([
        {
          status: "seated",
          date: "2026-06-15",
          time: "19:00",
          seated_at: lateSeatedAt,
        },
      ]),
    ).toEqual([{ type: "delay", date: "2026-06-15" }])
    expect(
      deriveGuestIncidents([
        {
          status: "completed",
          date: "2026-06-15",
          time: "19:00",
          seated_at: lateSeatedAt,
        },
      ]),
    ).toEqual([{ type: "delay", date: "2026-06-15" }])
  })

  it("reload returns the same incidents and another email is absent", async () => {
    const actions = (await import("@/app/actions/guest-profiles")) as {
      getGuestProfile: (email: string) => Promise<{
        error?: string
        incidents?: { type: string; date: string }[]
      }>
    }

    const adaDates = ["2026-06-01", "2026-06-02", "2026-06-03"] as const
    const rows: Row[] = [
      ...adaDates.map((date) => ({
        email: "ada@ex.com",
        status: "no_show",
        date,
        time: "19:00",
      })),
      {
        email: "bea@ex.com",
        status: "no_show",
        date: "2026-07-01",
        time: "19:00",
      },
    ]
    const eqCalls: unknown[][] = []

    mocks.requireStaffUser.mockResolvedValue({ id: "staff-1" })
    mocks.from.mockImplementation((table: string) => {
      if (table !== "reservations") {
        return thenable({ data: [], error: null })
      }
      return {
        select: () => {
          let matched = rows.map((row) => ({ ...row }))
          const chain = {
            eq: (column: string, value: unknown) => {
              eqCalls.push([column, value])
              if (column === "email_normalized") {
                matched = matched.filter(
                  (row) =>
                    guestProfiles.normalizeGuestEmail(
                      typeof row.email === "string" ? row.email : null,
                    ) === value,
                )
              }
              return chain
            },
            then: (
              resolve: (value: unknown) => unknown,
              reject?: (reason: unknown) => unknown,
            ) =>
              Promise.resolve({ data: matched, error: null }).then(
                resolve,
                reject,
              ),
          }
          return chain
        },
      }
    })

    const first = await actions.getGuestProfile("Ada@Ex.com")
    expect(first.incidents).toEqual(
      expect.arrayContaining(
        adaDates.map((date) => ({ type: "no_show", date })),
      ),
    )
    expect(first.incidents).toHaveLength(3)
    expect(
      first.incidents?.every((incident) => incident.type === "no_show"),
    ).toBe(true)
    expect(
      [...(first.incidents ?? [])].map((incident) => incident.date).sort(),
    ).toEqual([...adaDates])

    const fromCallsBeforeReload = mocks.from.mock.calls.length
    const reloaded = await actions.getGuestProfile("ada@ex.com")
    expect(mocks.from.mock.calls.length).toBeGreaterThan(fromCallsBeforeReload)
    expect(reloaded.incidents).toEqual(first.incidents)

    const eqCountBeforeBea = eqCalls.length
    const bea = await actions.getGuestProfile("bea@ex.com")
    expect(bea.incidents).toEqual([{ type: "no_show", date: "2026-07-01" }])
    expect((bea.incidents ?? []).map((incident) => incident.date)).not.toEqual(
      expect.arrayContaining([...adaDates]),
    )
    expect(eqCalls.slice(eqCountBeforeBea)).toContainEqual([
      "email_normalized",
      "bea@ex.com",
    ])

    const pageSource = readFileSync(
      path.join(root, "app/admin/customers/[email]/page.tsx"),
      "utf8",
    )
    const profileObject =
      pageSource.match(
        /<GuestProfilePanel[\s\S]*?profile=\{\{([\s\S]*?)\}\}/,
      )?.[1] ?? ""
    expect(profileObject).toContain("incidents:")
  })
})
