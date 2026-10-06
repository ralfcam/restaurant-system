import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { beforeEach, describe, expect, it, vi } from "vitest"
import * as guestProfileActions from "@/app/actions/guest-profiles"
import * as guestProfiles from "@/lib/guest-profiles"
import { isStaffUser } from "@/lib/supabase/is-staff-user"

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

type Row = Record<string, unknown>

type ListGuestSegments = (
  filters: Record<string, unknown>,
) => Promise<{ error?: string; guests?: unknown }>

type GuestSegmentActions = typeof guestProfileActions & {
  listGuestSegments?: ListGuestSegments
}

type GuestSegmentRow = {
  email: string | null
  guest_name: string | null
  phone: string | null
  date: string | null
  time: string | null
}

type SegmentGuests = (
  rows: GuestSegmentRow[],
  filters?: Record<string, unknown>,
) => Array<{
  email: string
  guest_name: string | null
  phone: string | null
  href: string | null
}>

type GuestProfilesModule = typeof guestProfiles & {
  segmentGuests?: SegmentGuests
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
const customersPage = path.join(root, "app/admin/customers/page.tsx")
const proxySource = path.join(root, "lib/supabase/proxy.ts")

describe("guest segmentation", () => {
  beforeEach(() => {
    mocks.requireStaffUser.mockReset()
    mocks.createServiceClient.mockReset()
    mocks.from.mockReset()
    mocks.requireStaffUser.mockResolvedValue({ id: "staff-1" })
    mocks.from.mockImplementation(() => thenable({ data: [], error: null }))
    mocks.createServiceClient.mockReturnValue({ from: mocks.from })
  })

  it("listing guests requires staff and the filter form is guest-segment-filters", async () => {
    const listGuestSegments = (guestProfileActions as GuestSegmentActions)
      .listGuestSegments

    expect(typeof listGuestSegments).toBe("function")
    if (typeof listGuestSegments !== "function") return

    mocks.requireStaffUser.mockResolvedValue(null)
    mocks.createServiceClient.mockClear()
    const unauthorized = await listGuestSegments({})
    expect(unauthorized).toEqual({
      error: "errors.guestProfiles.unauthorized",
    })
    expect(mocks.createServiceClient).not.toHaveBeenCalled()

    for (const user of [{ id: "staff-1" }, { id: "super-admin-1" }]) {
      mocks.requireStaffUser.mockResolvedValue(user)
      mocks.createServiceClient.mockClear()
      await listGuestSegments({})
      expect(mocks.createServiceClient).toHaveBeenCalled()
    }

    expect(existsSync(customersPage)).toBe(true)
    const page = readFileSync(customersPage, "utf8")
    const filterForm = 'data-testid="guest-segment-filters"'
    const errorAt = page.indexOf("result.error")
    const formAt = page.indexOf(filterForm)
    expect(page).toContain("listGuestSegments")
    expect(page).toContain(filterForm)
    expect(errorAt).toBeGreaterThanOrEqual(0)
    expect(formAt).toBeGreaterThan(errorAt)

    expect(readFileSync(proxySource, "utf8")).toContain(
      'user ? "/" : "/auth/login"',
    )
    expect(
      isStaffUser({
        app_metadata: { role: "super_admin" },
      } as unknown as Parameters<typeof isStaffUser>[0]),
    ).toBe(true)
  })

  it("loading filtering and clearing the guest list writes no reservation column", async () => {
    const writes: Array<"insert" | "update" | "delete"> = []
    const selects: unknown[] = []

    function recordingThenable() {
      const builder: Record<string, unknown> = {}
      const self = new Proxy(builder, {
        get(_target, prop) {
          if (prop === "then") {
            return (
              resolve: (value: { data: never[]; error: null }) => unknown,
              reject?: (reason: unknown) => unknown,
            ) =>
              Promise.resolve({ data: [], error: null }).then(resolve, reject)
          }
          if (prop === "insert" || prop === "update" || prop === "delete") {
            return () => {
              writes.push(prop)
              return self
            }
          }
          if (prop === "select") {
            return (columns?: unknown) => {
              selects.push(columns)
              return self
            }
          }
          return () => self
        },
      })
      return self
    }

    mocks.requireStaffUser.mockResolvedValue({ id: "staff-1" })
    mocks.from.mockImplementation(() => recordingThenable())

    const listGuestSegments =
      guestProfileActions.listGuestSegments as unknown as (filters?: {
        name?: string
      }) => Promise<unknown>

    await listGuestSegments({})
    await listGuestSegments({ name: "ada" })
    await listGuestSegments({})

    expect(writes).toEqual([])
    expect(selects).toEqual([
      "email, guest_name, phone, status, date, time",
      "email, guest_name, phone, status, date, time",
      "email, guest_name, phone, status, date, time",
    ])

    const page = readFileSync(customersPage, "utf8")
    expect(page).not.toContain("updateGuestProfilePii")
    expect(page).not.toContain("confirmGuestMerge")
  })

  it("one normalized email uses the newest name and phone and links to the ficha", () => {
    const segmentGuests = (guestProfiles as GuestProfilesModule).segmentGuests

    expect(typeof segmentGuests).toBe("function")
    if (typeof segmentGuests !== "function") return

    const guests = segmentGuests([
      {
        email: "ada@ex.com",
        guest_name: "Ada Old",
        phone: "111",
        date: "2026-01-01",
        time: "12:00",
      },
      {
        email: "Ada@ex.com",
        guest_name: "Ada New",
        phone: "222",
        date: "2026-06-01",
        time: "19:00",
      },
      {
        email: "Ada@ex.com",
        guest_name: "Ada Mid",
        phone: "333",
        date: "2026-06-01",
        time: "12:00",
      },
      {
        email: null,
        guest_name: null,
        phone: null,
        date: null,
        time: null,
      },
      {
        email: "  ",
        guest_name: null,
        phone: null,
        date: null,
        time: null,
      },
      {
        email: "",
        guest_name: null,
        phone: null,
        date: null,
        time: null,
      },
      {
        email: "bob@ex.com",
        guest_name: "Bob",
        phone: "444",
        date: "2026-03-01",
        time: "18:00",
      },
    ])

    expect(guests.map((guest) => guest.email)).toEqual([
      "ada@ex.com",
      "bob@ex.com",
    ])
    const ada = guests.find((guest) => guest.email === "ada@ex.com")
    expect(ada?.guest_name).toBe("Ada New")
    expect(ada?.phone).toBe("222")
    const bob = guests.find((guest) => guest.email === "bob@ex.com")
    expect(bob?.href).toBe("/admin/customers/bob%40ex.com")
  })

  it("combined filters keep only guests that match every set filter", () => {
    const segmentGuests = (guestProfiles as GuestProfilesModule).segmentGuests

    expect(typeof segmentGuests).toBe("function")
    if (typeof segmentGuests !== "function") return

    const filterGuests = segmentGuests as (
      rows: Array<GuestSegmentRow & { status: string }>,
      filters?: {
        name?: string
        phone?: string
        minCompleted?: number
        hasNoShow?: boolean
        lastVisitOnOrBefore?: string
      },
    ) => ReturnType<SegmentGuests>

    const rows = [
      {
        email: "ada@ex.com",
        guest_name: "Ada Lovelace",
        phone: "555-0100",
        status: "completed",
        date: "2026-05-01",
        time: "12:00",
      },
      {
        email: "ada@ex.com",
        guest_name: "Ada Lovelace",
        phone: "555-0100",
        status: "completed",
        date: "2026-06-01",
        time: "19:00",
      },
      {
        email: "ada@ex.com",
        guest_name: "Ada Lovelace",
        phone: "555-0100",
        status: "no_show",
        date: "2026-04-01",
        time: "12:00",
      },
      {
        email: "bea@ex.com",
        guest_name: "ada",
        phone: "555-0199",
        status: "completed",
        date: "2026-05-01",
        time: "12:00",
      },
      {
        email: "bea@ex.com",
        guest_name: "ada",
        phone: "555-0199",
        status: "completed",
        date: "2026-06-01",
        time: "19:00",
      },
      {
        email: "cara@ex.com",
        guest_name: "Ada Lovelace",
        phone: "555-0100",
        status: "completed",
        date: "2026-07-01",
        time: "19:00",
      },
      {
        email: "cara@ex.com",
        guest_name: "Ada Lovelace",
        phone: "555-0100",
        status: "no_show",
        date: "2026-04-01",
        time: "12:00",
      },
      {
        email: "dot@ex.com",
        guest_name: "Cara",
        phone: "555-0100",
        status: "completed",
        date: "2026-05-01",
        time: "12:00",
      },
      {
        email: "dot@ex.com",
        guest_name: "Cara",
        phone: "555-0100",
        status: "completed",
        date: "2026-05-02",
        time: "12:00",
      },
      {
        email: "dot@ex.com",
        guest_name: "Cara",
        phone: "555-0100",
        status: "no_show",
        date: "2026-04-01",
        time: "12:00",
      },
    ]

    const emails = (filters?: Parameters<typeof filterGuests>[1]) =>
      filterGuests(rows, filters).map((guest) => guest.email)

    const full = filterGuests(rows, {
      name: "  LOVELACE ",
      phone: "0100",
      minCompleted: 2,
      hasNoShow: true,
      lastVisitOnOrBefore: "2026-06-15",
    })
    expect(full.map((guest) => guest.email)).toEqual(["ada@ex.com"])
    expect(full.map((guest) => guest.email)).not.toContain("dot@ex.com")
    expect(full[0]?.guest_name).toBe("Ada Lovelace")
    expect(full[0]?.phone).toBe("555-0100")

    expect(
      emails({
        phone: "0100",
        minCompleted: 2,
        hasNoShow: true,
        lastVisitOnOrBefore: "2026-06-15",
      }),
    ).toEqual(["ada@ex.com", "dot@ex.com"])

    expect(emails({ name: "  LOVELACE " })).toEqual([
      "ada@ex.com",
      "cara@ex.com",
    ])

    expect(emails({ phone: "0100" })).toEqual([
      "ada@ex.com",
      "cara@ex.com",
      "dot@ex.com",
    ])
  })

  it("clearing every filter returns every guest row", async () => {
    const segmentGuests = (guestProfiles as GuestProfilesModule).segmentGuests

    expect(typeof segmentGuests).toBe("function")
    if (typeof segmentGuests !== "function") return

    const filterGuests = segmentGuests as (
      rows: Array<GuestSegmentRow & { status: string }>,
      filters?: { name?: string },
    ) => ReturnType<SegmentGuests>

    const rows = [
      {
        email: "ada@ex.com",
        guest_name: "Ada Lovelace",
        phone: "555-0100",
        status: "completed",
        date: "2026-05-01",
        time: "12:00",
      },
      {
        email: "ada@ex.com",
        guest_name: "Ada Lovelace",
        phone: "555-0100",
        status: "completed",
        date: "2026-06-01",
        time: "19:00",
      },
      {
        email: "ada@ex.com",
        guest_name: "Ada Lovelace",
        phone: "555-0100",
        status: "no_show",
        date: "2026-04-01",
        time: "12:00",
      },
      {
        email: "bea@ex.com",
        guest_name: "ada",
        phone: "555-0199",
        status: "completed",
        date: "2026-05-01",
        time: "12:00",
      },
      {
        email: "bea@ex.com",
        guest_name: "ada",
        phone: "555-0199",
        status: "completed",
        date: "2026-06-01",
        time: "19:00",
      },
      {
        email: "cara@ex.com",
        guest_name: "Ada Lovelace",
        phone: "555-0100",
        status: "completed",
        date: "2026-07-01",
        time: "19:00",
      },
      {
        email: "cara@ex.com",
        guest_name: "Ada Lovelace",
        phone: "555-0100",
        status: "no_show",
        date: "2026-04-01",
        time: "12:00",
      },
      {
        email: "dot@ex.com",
        guest_name: "Cara",
        phone: "555-0100",
        status: "completed",
        date: "2026-05-01",
        time: "12:00",
      },
      {
        email: "dot@ex.com",
        guest_name: "Cara",
        phone: "555-0100",
        status: "completed",
        date: "2026-05-02",
        time: "12:00",
      },
      {
        email: "dot@ex.com",
        guest_name: "Cara",
        phone: "555-0100",
        status: "no_show",
        date: "2026-04-01",
        time: "12:00",
      },
    ]

    const emails = (filters?: { name?: string }) =>
      filterGuests(rows, filters).map((guest) => guest.email)
    const everyGuest = ["ada@ex.com", "bea@ex.com", "cara@ex.com", "dot@ex.com"]

    const named = emails({ name: "lovelace" })
    expect(named).not.toContain("bea@ex.com")
    expect(named).not.toContain("dot@ex.com")
    expect(emails()).toEqual(everyGuest)
    expect(emails({})).toEqual(everyGuest)

    const parseGuestSegmentFilters = (
      guestProfiles as GuestProfilesModule & {
        parseGuestSegmentFilters?: (
          filters: Record<string, unknown>,
        ) => Record<string, unknown>
      }
    ).parseGuestSegmentFilters

    expect(typeof parseGuestSegmentFilters).toBe("function")
    if (typeof parseGuestSegmentFilters !== "function") return
    expect(parseGuestSegmentFilters({})).toEqual({})

    mocks.requireStaffUser.mockResolvedValue({ id: "staff-1" })
    mocks.from.mockImplementation(() => thenable({ data: rows, error: null }))

    const listGuestSegments =
      guestProfileActions.listGuestSegments as unknown as (filters?: {
        name?: string
      }) => Promise<{ guests?: Array<{ email: string }> }>

    const listed = await listGuestSegments({})
    expect(listed.guests?.map((guest) => guest.email)).toEqual(everyGuest)
  })

  it("changing a filter changes the rows and an empty match does not error", async () => {
    const segmentGuests = (guestProfiles as GuestProfilesModule).segmentGuests

    expect(typeof segmentGuests).toBe("function")
    if (typeof segmentGuests !== "function") return

    const filterGuests = segmentGuests as (
      rows: Array<GuestSegmentRow & { status: string }>,
      filters?: { name?: string },
    ) => ReturnType<SegmentGuests>

    const rows = [
      {
        email: "ada@ex.com",
        guest_name: "Ada Lovelace",
        phone: "555-0100",
        status: "completed",
        date: "2026-05-01",
        time: "12:00",
      },
      {
        email: "ada@ex.com",
        guest_name: "Ada Lovelace",
        phone: "555-0100",
        status: "completed",
        date: "2026-06-01",
        time: "19:00",
      },
      {
        email: "ada@ex.com",
        guest_name: "Ada Lovelace",
        phone: "555-0100",
        status: "no_show",
        date: "2026-04-01",
        time: "12:00",
      },
      {
        email: "bea@ex.com",
        guest_name: "ada",
        phone: "555-0199",
        status: "completed",
        date: "2026-05-01",
        time: "12:00",
      },
      {
        email: "bea@ex.com",
        guest_name: "ada",
        phone: "555-0199",
        status: "completed",
        date: "2026-06-01",
        time: "19:00",
      },
      {
        email: "cara@ex.com",
        guest_name: "Ada Lovelace",
        phone: "555-0100",
        status: "completed",
        date: "2026-07-01",
        time: "19:00",
      },
      {
        email: "cara@ex.com",
        guest_name: "Ada Lovelace",
        phone: "555-0100",
        status: "no_show",
        date: "2026-04-01",
        time: "12:00",
      },
      {
        email: "dot@ex.com",
        guest_name: "Cara",
        phone: "555-0100",
        status: "completed",
        date: "2026-05-01",
        time: "12:00",
      },
      {
        email: "dot@ex.com",
        guest_name: "Cara",
        phone: "555-0100",
        status: "completed",
        date: "2026-05-02",
        time: "12:00",
      },
      {
        email: "dot@ex.com",
        guest_name: "Cara",
        phone: "555-0100",
        status: "no_show",
        date: "2026-04-01",
        time: "12:00",
      },
    ]

    expect(
      filterGuests(rows, { name: "ada" }).map((guest) => guest.email),
    ).toEqual(["ada@ex.com", "bea@ex.com", "cara@ex.com"])
    expect(filterGuests(rows, { name: "zzz" })).toEqual([])

    mocks.requireStaffUser.mockResolvedValue({ id: "staff-1" })
    mocks.from.mockImplementation(() => thenable({ data: rows, error: null }))

    const listGuestSegments =
      guestProfileActions.listGuestSegments as unknown as (filters?: {
        name?: string
      }) => Promise<unknown>

    await expect(listGuestSegments({ name: "zzz" })).resolves.toEqual({
      guests: [],
    })
  })
})
