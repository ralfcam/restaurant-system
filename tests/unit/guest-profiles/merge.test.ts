import { readFileSync } from "node:fs"
import path from "node:path"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { buildGuestProfile } from "@/lib/guest-profiles"
import * as guestProfiles from "@/lib/guest-profiles"

type MergeRow = {
  id: string
  email: string
  phone: string | null
  date: string
  time: string
}

type StoredMergeRow = Omit<MergeRow, "email"> & { email: string | null }

type MergeWrite = {
  op: "insert" | "update" | "delete"
  payload: Record<string, unknown> | null
  eq: Array<[string, unknown]>
  select: string | null
}

const mocks = vi.hoisted(() => ({
  requireStaffUser: vi.fn(),
  createServiceClient: vi.fn(),
  from: vi.fn(),
  rows: [] as StoredMergeRow[],
  writes: [] as MergeWrite[],
}))

vi.mock("@/lib/supabase/require-staff", () => ({
  requireStaffUser: mocks.requireStaffUser,
}))

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: (...args: unknown[]) =>
    mocks.createServiceClient(...args),
}))

type Row = Record<string, unknown>

type MergeActions = {
  listGuestMergeCandidates: (email: string) => Promise<{
    error?: string
    candidates?: string[]
  }>
  confirmGuestMerge: (input: {
    survivingEmail: string
    otherEmail: string
  }) => Promise<{ error?: string; ok?: true }>
}

function thenable<T>(value: T) {
  const state: {
    op: "select" | "insert" | "update" | "delete" | null
    payload: Record<string, unknown> | null
    eq: Array<[string, unknown]>
    selected: string | null
    recorded: boolean
  } = {
    op: null,
    payload: null,
    eq: [],
    selected: null,
    recorded: false,
  }
  const builder: Record<string, unknown> = {}
  const self = new Proxy(builder, {
    get(_target, prop) {
      if (prop === "then") {
        return (
          resolve: (_resolved: T) => unknown,
          reject?: (reason: unknown) => unknown,
        ) => {
          if (
            !state.recorded &&
            (state.op === "insert" ||
              state.op === "update" ||
              state.op === "delete")
          ) {
            state.recorded = true
            mocks.writes.push({
              op: state.op,
              payload: state.payload,
              eq: state.eq.map(([col, val]) => [col, val]),
              select: state.selected,
            })
            const nextEmail = state.payload?.email
            const emailEq = state.eq.find(([col]) => col === "email_normalized")
            if (
              state.op === "update" &&
              emailEq &&
              typeof nextEmail === "string"
            ) {
              const target = emailEq[1]
              for (const row of mocks.rows) {
                if (typeof row.email !== "string") continue
                if (row.email.trim().toLowerCase() === target) {
                  row.email = nextEmail
                }
              }
            }
          }
          const resolvedValue =
            state.op === "select" || state.selected != null
              ? { data: mocks.rows, error: null }
              : value
          return Promise.resolve(resolvedValue as T).then(resolve, reject)
        }
      }
      if (prop === "single" || prop === "maybeSingle") {
        const payload = value as { data: Row | Row[] | null; error: unknown }
        const row = Array.isArray(payload.data)
          ? (payload.data[0] ?? null)
          : payload.data
        return async () => ({ data: row, error: row ? null : payload.error })
      }
      if (prop === "insert" || prop === "update" || prop === "delete") {
        return (payload?: unknown) => {
          state.op = prop
          state.payload =
            payload && typeof payload === "object" && !Array.isArray(payload)
              ? { ...(payload as Record<string, unknown>) }
              : null
          return self
        }
      }
      if (prop === "select") {
        return (columns?: unknown) => {
          state.selected = typeof columns === "string" ? columns : null
          if (
            state.op !== "insert" &&
            state.op !== "update" &&
            state.op !== "delete"
          ) {
            state.op = "select"
          }
          return self
        }
      }
      if (prop === "eq") {
        return (col: unknown, val: unknown) => {
          state.eq.push([String(col), val])
          return self
        }
      }
      return () => self
    },
  })
  return self
}

const root = process.cwd()
const actionsPath = path.join(root, "app/actions/guest-profiles.ts")
const staffUserSource = path.join(root, "lib/supabase/is-staff-user.ts")
const proxySource = path.join(root, "lib/supabase/proxy.ts")
const panelSource = path.join(root, "components/staff/guest-profile-panel.tsx")
const customersPage = path.join(root, "app/admin/customers/[email]/page.tsx")

describe("guest profile merge", () => {
  beforeEach(() => {
    mocks.requireStaffUser.mockReset()
    mocks.createServiceClient.mockReset()
    mocks.from.mockReset()
    mocks.rows = []
    mocks.writes = []
    mocks.from.mockImplementation(() => thenable({ data: [], error: null }))
    mocks.createServiceClient.mockReturnValue({ from: mocks.from })
  })

  it("listing and confirming a merge require staff and the ficha control is guest-merge", async () => {
    const namespace =
      (await import("@/app/actions/guest-profiles")) as Partial<MergeActions>
    expect(typeof namespace.listGuestMergeCandidates).toBe("function")
    expect(typeof namespace.confirmGuestMerge).toBe("function")

    const actionsSource = readFileSync(actionsPath, "utf8")
    expect(actionsSource).toContain("listGuestMergeCandidates")
    expect(actionsSource).toContain("confirmGuestMerge")
    expect(actionsSource).toContain("requireStaffUser")
    expect(actionsSource).not.toContain("requireSuperAdminUser")

    const { listGuestMergeCandidates, confirmGuestMerge } =
      namespace as MergeActions

    mocks.requireStaffUser.mockResolvedValue(null)
    mocks.createServiceClient.mockClear()
    const listed = await listGuestMergeCandidates("ada@ex.com")
    const confirmed = await confirmGuestMerge({
      survivingEmail: "ada@ex.com",
      otherEmail: "bob@ex.com",
    })
    expect(listed).toEqual({ error: "errors.guestProfiles.unauthorized" })
    expect(confirmed).toEqual({ error: "errors.guestProfiles.unauthorized" })
    expect(mocks.createServiceClient).not.toHaveBeenCalled()

    for (const user of [{ id: "staff-1" }, { id: "super-admin-1" }]) {
      mocks.requireStaffUser.mockResolvedValue(user)

      mocks.createServiceClient.mockClear()
      await listGuestMergeCandidates("ada@ex.com")
      expect(mocks.createServiceClient).toHaveBeenCalled()

      mocks.createServiceClient.mockClear()
      await confirmGuestMerge({
        survivingEmail: "ada@ex.com",
        otherEmail: "bob@ex.com",
      })
      expect(mocks.createServiceClient).toHaveBeenCalled()
    }

    const staffSource = readFileSync(staffUserSource, "utf8")
    expect(staffSource).toContain("super_admin")
    expect(staffSource).toMatch(
      /function isStaffUser[\s\S]*isSuperAdminUser\s*\(/,
    )

    expect(readFileSync(proxySource, "utf8")).toContain(
      'user ? "/" : "/auth/login"',
    )
    expect(readFileSync(panelSource, "utf8")).toContain(
      'data-testid="guest-merge"',
    )

    const page = readFileSync(customersPage, "utf8")
    expect(page).toContain("listGuestMergeCandidates")
    expect(page).toContain("mergeCandidates")
  })

  it("confirm rewrites the other email onto the surviving email and does not copy rows", async () => {
    const rows: Array<MergeRow & { phone: string }> = [
      {
        id: "r1",
        email: "Ada@ex.com",
        phone: "+41 79 111 22 33",
        date: "2026-01-02",
        time: "18:00",
      },
      {
        id: "r2",
        email: "bob@ex.com",
        phone: "+41791112233",
        date: "2026-06-01",
        time: "19:00",
      },
      {
        id: "r3",
        email: "bob@ex.com",
        phone: "+41791112233",
        date: "2026-06-01",
        time: "12:00",
      },
    ]
    mocks.rows = rows
    mocks.requireStaffUser.mockResolvedValue({ id: "staff-1" })

    const { confirmGuestMerge } =
      (await import("@/app/actions/guest-profiles")) as MergeActions
    await confirmGuestMerge({
      survivingEmail: "Ada@ex.com",
      otherEmail: "bob@ex.com",
    })

    const update = mocks.writes.find((write) => write.op === "update")
    expect(update).toEqual({
      op: "update",
      payload: { email: "ada@ex.com" },
      eq: [["email_normalized", "bob@ex.com"]],
      select: "id",
    })
    expect(mocks.writes.filter((write) => write.op === "insert")).toEqual([])
    expect(mocks.writes.filter((write) => write.op === "delete")).toEqual([])
    expect(
      buildGuestProfile("ada@ex.com", rows).history.map(
        (row) => (row as unknown as { id: string }).id,
      ),
    ).toEqual(["r2", "r3", "r1"])
  })

  it("confirm leaves a third email and a blank email unchanged", async () => {
    const rows: StoredMergeRow[] = [
      {
        id: "r1",
        email: "Ada@ex.com",
        phone: "+41 79 111 22 33",
        date: "2026-01-02",
        time: "18:00",
      },
      {
        id: "r2",
        email: "bob@ex.com",
        phone: "+41791112233",
        date: "2026-06-01",
        time: "19:00",
      },
      {
        id: "r4",
        email: "cara@ex.com",
        phone: "+41 79 999 00 00",
        date: "2026-03-04",
        time: "12:00",
      },
      {
        id: "r5",
        email: null,
        phone: "+41 79 111 22 33",
        date: "2026-04-05",
        time: "13:00",
      },
      {
        id: "r6",
        email: "  ",
        phone: "+41 79 111 22 33",
        date: "2026-05-06",
        time: "14:00",
      },
    ]
    mocks.rows = rows
    mocks.requireStaffUser.mockResolvedValue({ id: "staff-1" })

    const { confirmGuestMerge } =
      (await import("@/app/actions/guest-profiles")) as MergeActions
    await confirmGuestMerge({
      survivingEmail: "ada@ex.com",
      otherEmail: "bob@ex.com",
    })

    const updates = mocks.writes.filter((write) => write.op === "update")
    expect(updates).toHaveLength(1)
    expect(updates[0]?.eq).toEqual([["email_normalized", "bob@ex.com"]])
    expect(updates[0]?.payload?.email).toBe("ada@ex.com")
    expect(mocks.writes.filter((write) => write.op === "insert")).toEqual([])
    expect(mocks.writes.filter((write) => write.op === "delete")).toEqual([])
    expect(rows.find((row) => row.id === "r4")?.email).toBe("cara@ex.com")
    expect(rows.find((row) => row.id === "r5")?.email).toBeNull()
    expect(rows.find((row) => row.id === "r6")?.email).toBe("  ")
  })

  it("candidates share one normalized phone and the list does not write", async () => {
    expect(typeof guestProfiles.mergeCandidateEmails).toBe("function")
    expect(typeof guestProfiles.normalizeGuestPhone).toBe("function")

    const normalizeGuestPhone = guestProfiles.normalizeGuestPhone as (
      phone: string | null | undefined,
    ) => string | null
    const mergeCandidateEmails = guestProfiles.mergeCandidateEmails as (
      rows: Array<{
        email: string | null
        phone: string | null
        guest_name?: string | null
      }>,
      email: string | null,
    ) => string[]

    expect(normalizeGuestPhone(null)).toBeNull()
    expect(normalizeGuestPhone("")).toBeNull()
    expect(normalizeGuestPhone("   ")).toBeNull()
    expect(normalizeGuestPhone(undefined)).toBeNull()
    expect(normalizeGuestPhone("  +41 79 111 22 33  ")).toBe("+41791112233")
    expect(normalizeGuestPhone("+41\t79 111")).toBe("+41\t79111")
    expect(normalizeGuestPhone("\t+41 79\t")).toBe("+4179")

    const rows: Array<StoredMergeRow & { guest_name?: string | null }> = [
      {
        id: "ada-1",
        email: "Ada@ex.com",
        phone: "+41 79 111 22 33",
        guest_name: "Ada",
        date: "2026-01-02",
        time: "18:00",
      },
      {
        id: "bob-1",
        email: "bob@ex.com",
        phone: "+41791112233",
        guest_name: "Bob",
        date: "2026-06-01",
        time: "19:00",
      },
      {
        id: "bob-2",
        email: "Bob@EX.com",
        phone: "+41 79 111 22 33",
        guest_name: "Bob",
        date: "2026-06-01",
        time: "12:00",
      },
      {
        id: "cara-1",
        email: "cara@ex.com",
        phone: "+41 79 999 00 00",
        guest_name: "Cara",
        date: "2026-03-04",
        time: "12:00",
      },
      {
        id: "dee-1",
        email: "dee@ex.com",
        phone: null,
        guest_name: "Dee",
        date: "2026-03-05",
        time: "12:00",
      },
      {
        id: "eve-1",
        email: "eve@ex.com",
        phone: "",
        guest_name: "Eve",
        date: "2026-03-06",
        time: "12:00",
      },
      {
        id: "fay-1",
        email: "fay@ex.com",
        phone: "   ",
        guest_name: "Fay",
        date: "2026-03-07",
        time: "12:00",
      },
      {
        id: "gio-1",
        email: "gio@ex.com",
        phone: "+41 22 000 00 00",
        guest_name: "Ada",
        date: "2026-03-08",
        time: "12:00",
      },
      {
        id: "blank-1",
        email: null,
        phone: "+41 79 111 22 33",
        guest_name: null,
        date: "2026-04-05",
        time: "13:00",
      },
      {
        id: "blank-2",
        email: "  ",
        phone: "+41791112233",
        guest_name: null,
        date: "2026-05-06",
        time: "14:00",
      },
    ]

    expect(mergeCandidateEmails(rows, "Ada@ex.com")).toEqual(["bob@ex.com"])
    expect(mergeCandidateEmails(rows, "ada@ex.com")).toEqual(["bob@ex.com"])
    expect(mergeCandidateEmails(rows, "bob@ex.com")).toEqual(["ada@ex.com"])
    expect(mergeCandidateEmails(rows, "cara@ex.com")).toEqual([])
    expect(mergeCandidateEmails(rows, "dee@ex.com")).toEqual([])
    expect(mergeCandidateEmails(rows, "eve@ex.com")).toEqual([])
    expect(mergeCandidateEmails(rows, "fay@ex.com")).toEqual([])
    expect(mergeCandidateEmails(rows, "gio@ex.com")).toEqual([])
    expect(mergeCandidateEmails(rows, "")).toEqual([])
    expect(mergeCandidateEmails(rows, "   ")).toEqual([])
    expect(mergeCandidateEmails(rows, null)).toEqual([])

    mocks.rows = rows
    mocks.requireStaffUser.mockResolvedValue({ id: "staff-1" })

    const { listGuestMergeCandidates } =
      (await import("@/app/actions/guest-profiles")) as MergeActions
    const listed = await listGuestMergeCandidates("ada@ex.com")
    expect(listed).toEqual({ candidates: ["bob@ex.com"] })
    expect(
      mocks.writes.filter(
        (write) =>
          write.op === "insert" ||
          write.op === "update" ||
          write.op === "delete",
      ),
    ).toEqual([])
  })

  it("confirm writes nothing for a non-candidate, the same email, or a blank email", async () => {
    mocks.requireStaffUser.mockResolvedValue({ id: "staff-1" })
    const { confirmGuestMerge } =
      (await import("@/app/actions/guest-profiles")) as MergeActions

    const writes = () =>
      mocks.writes.filter(
        (write) =>
          write.op === "insert" ||
          write.op === "update" ||
          write.op === "delete",
      )

    mocks.writes = []
    mocks.rows = [
      {
        id: "ada-1",
        email: "ada@ex.com",
        phone: "+41 79 111 22 33",
        date: "2026-01-02",
        time: "18:00",
      },
      {
        id: "cara-1",
        email: "cara@ex.com",
        phone: "+41 79 999 00 00",
        date: "2026-03-04",
        time: "12:00",
      },
    ]
    const refused = await confirmGuestMerge({
      survivingEmail: "ada@ex.com",
      otherEmail: "cara@ex.com",
    })
    expect(refused).toEqual({ ok: true })
    expect(writes()).toEqual([])

    mocks.writes = []
    mocks.rows = [
      {
        id: "ada-1",
        email: "ada@ex.com",
        phone: "+41 79 111 22 33",
        date: "2026-01-02",
        time: "18:00",
      },
      {
        id: "cara-1",
        email: "cara@ex.com",
        phone: "+41 79 999 00 00",
        date: "2026-03-04",
        time: "12:00",
      },
    ]
    await confirmGuestMerge({
      survivingEmail: "ada@ex.com",
      otherEmail: "ada@ex.com",
    })
    expect(writes()).toEqual([])

    mocks.writes = []
    mocks.rows = [
      {
        id: "ada-1",
        email: "ada@ex.com",
        phone: "+41 79 111 22 33",
        date: "2026-01-02",
        time: "18:00",
      },
    ]
    await confirmGuestMerge({
      survivingEmail: "ada@ex.com",
      otherEmail: "  ",
    })
    expect(writes()).toEqual([])

    mocks.writes = []
    mocks.rows = [
      {
        id: "ada-1",
        email: "Ada@ex.com",
        phone: "+41 79 111 22 33",
        date: "2026-01-02",
        time: "18:00",
      },
      {
        id: "bob-1",
        email: "bob@ex.com",
        phone: "+41791112233",
        date: "2026-06-01",
        time: "19:00",
      },
    ]
    await confirmGuestMerge({
      survivingEmail: "Ada@ex.com",
      otherEmail: "bob@ex.com",
    })
    expect(mocks.writes.find((write) => write.op === "update")).toEqual({
      op: "update",
      payload: { email: "ada@ex.com" },
      eq: [["email_normalized", "bob@ex.com"]],
      select: "id",
    })
  })

  it("opening the ficha and listing candidates writes no email change", async () => {
    mocks.rows = [
      {
        id: "ada-1",
        email: "ada@ex.com",
        phone: "+41 79 111 22 33",
        date: "2026-01-02",
        time: "18:00",
      },
      {
        id: "bob-1",
        email: "bob@ex.com",
        phone: "+41791112233",
        date: "2026-06-01",
        time: "19:00",
      },
    ]
    mocks.requireStaffUser.mockResolvedValue({ id: "staff-1" })

    const { getGuestProfile, listGuestMergeCandidates } =
      (await import("@/app/actions/guest-profiles")) as MergeActions & {
        getGuestProfile: (email: string) => Promise<unknown>
      }

    await getGuestProfile("ada@ex.com")
    await listGuestMergeCandidates("ada@ex.com")
    await listGuestMergeCandidates("ada@ex.com")

    expect(
      mocks.writes.filter(
        (write) =>
          write.op === "insert" ||
          write.op === "update" ||
          write.op === "delete",
      ),
    ).toEqual([])

    expect(readFileSync(customersPage, "utf8")).not.toContain(
      "confirmGuestMerge",
    )

    const panel = readFileSync(panelSource, "utf8")
    const mergeMarker = 'data-testid="guest-merge"'
    const start = panel.indexOf(mergeMarker)
    expect(start).toBeGreaterThanOrEqual(0)
    const nextAttr = panel.indexOf('data-testid="', start + mergeMarker.length)
    expect(nextAttr).toBeGreaterThan(start)
    expect(panel.startsWith('data-testid="guest-incidents"', nextAttr)).toBe(
      true,
    )
    const region = panel.slice(start, nextAttr)
    const outside = panel.slice(0, start) + panel.slice(nextAttr)

    expect(outside).not.toContain("confirmGuestMerge(")
    expect(region).not.toContain('type="email"')
    expect(region).not.toContain("type='email'")
    expect(region).toContain("confirmGuestMerge")

    const mapped = region.match(
      /mergeCandidates[\s\S]{0,120}?\.map\(\s*\(\s*([A-Za-z_$][\w$]*)/,
    )
    expect(mapped?.[1]).toBeTruthy()
    const other = mapped?.[1] ?? ""
    expect(submitSurvivesAs(region, "profile.email")).toBe(true)
    expect(submitSurvivesAs(region, other)).toBe(true)
    expect(callsConfirmGuestMerge(region, "profile.email", other)).toBe(true)
    expect(callsConfirmGuestMerge(region, other, "profile.email")).toBe(true)
  })
})

function submitSurvivesAs(region: string, expr: string): boolean {
  const tag = expr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  return new RegExp(
    `<button\\b(?=[^>]*\\btype=["']submit["'])(?=[^>]*\\bvalue=\\{${tag}\\})[^>]*>\\s*\\{${tag}\\}`,
  ).test(region)
}

function callsConfirmGuestMerge(
  region: string,
  surviving: string,
  other: string,
): boolean {
  const survivingExpr = surviving.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const otherExpr = other.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const flat = "[^{}]*"
  const survivingFirst = new RegExp(
    `confirmGuestMerge\\s*\\(\\s*\\{${flat}survivingEmail\\s*:\\s*${survivingExpr}${flat}otherEmail\\s*:\\s*${otherExpr}${flat}\\}`,
  )
  const otherFirst = new RegExp(
    `confirmGuestMerge\\s*\\(\\s*\\{${flat}otherEmail\\s*:\\s*${otherExpr}${flat}survivingEmail\\s*:\\s*${survivingExpr}${flat}\\}`,
  )
  return survivingFirst.test(region) || otherFirst.test(region)
}
