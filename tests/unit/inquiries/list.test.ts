import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  requireStaffUser: vi.fn(),
  createServiceClient: vi.fn(),
  from: vi.fn(),
  in: vi.fn(),
  order: vi.fn(),
  eq: vi.fn(),
  gte: vi.fn(),
  lte: vi.fn(),
}))

vi.mock("@/lib/supabase/require-staff", () => ({
  requireStaffUser: mocks.requireStaffUser,
}))

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: (...args: unknown[]) =>
    mocks.createServiceClient(...args),
}))

type Row = Record<string, unknown>

type InquiryListFilter = { status?: "declined" | "closed" | "all" }

type InquiryListResult = { inquiries: Row[]; error?: string }

type GetEventInquiries = (
  filter?: InquiryListFilter,
) => Promise<InquiryListResult>

let queryResult: { data: Row[] | null; error: unknown }

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
      if (prop === "in") {
        return (...args: unknown[]) => {
          mocks.in(...args)
          return self
        }
      }
      if (prop === "order") {
        return (...args: unknown[]) => {
          mocks.order(...args)
          return self
        }
      }
      if (prop === "eq") {
        return (...args: unknown[]) => {
          mocks.eq(...args)
          return self
        }
      }
      if (prop === "gte") {
        return (...args: unknown[]) => {
          mocks.gte(...args)
          return self
        }
      }
      if (prop === "lte") {
        return (...args: unknown[]) => {
          mocks.lte(...args)
          return self
        }
      }
      return () => self
    },
  })
  return self
}

function resetQuerySpies() {
  mocks.from.mockClear()
  mocks.in.mockClear()
  mocks.order.mockClear()
  mocks.eq.mockClear()
  mocks.gte.mockClear()
  mocks.lte.mockClear()
}

function orderedColumns() {
  return mocks.order.mock.calls.map((call) => call[0])
}

function dateConstraints() {
  return [
    ...mocks.eq.mock.calls,
    ...mocks.gte.mock.calls,
    ...mocks.lte.mock.calls,
  ].filter((call) => call[0] === "requested_date" || call[0] === "date")
}

function inquiriesChromeSource() {
  const root = process.cwd()
  const page = path.join(root, "app/admin/inquiries/page.tsx")
  const manager = path.join(root, "components/staff/inquiries-manager.tsx")
  const parts: string[] = []
  if (existsSync(page)) parts.push(readFileSync(page, "utf8"))
  if (existsSync(manager)) parts.push(readFileSync(manager, "utf8"))
  return parts.join("\n")
}

const openRow = {
  id: "inq-1",
  guest_name: "Ada Lovelace",
  status: "open",
  requested_date: "2026-09-20",
  created_at: "2026-09-13T10:00:00.000Z",
}

describe("getEventInquiries", () => {
  beforeEach(() => {
    mocks.requireStaffUser.mockReset()
    mocks.createServiceClient.mockReset()
    mocks.from.mockReset()
    mocks.in.mockReset()
    mocks.order.mockReset()
    mocks.eq.mockReset()
    mocks.gte.mockReset()
    mocks.lte.mockReset()
    mocks.requireStaffUser.mockResolvedValue({ id: "staff-1" })
    queryResult = { data: [], error: null }
    mocks.from.mockImplementation(() => thenable(queryResult))
    mocks.createServiceClient.mockReturnValue({ from: mocks.from })
  })

  it("list defaults to open+contacted and fail-closes", async () => {
    const { getEventInquiries } = (await import("@/app/actions/inquiries")) as {
      getEventInquiries: GetEventInquiries
    }

    queryResult = { data: [openRow], error: null }
    const listed = await getEventInquiries()
    expect(listed).toEqual({ inquiries: [openRow] })
    expect(listed).not.toHaveProperty("error")
    expect(mocks.from).toHaveBeenCalledWith("event_inquiries")
    expect(mocks.from).not.toHaveBeenCalledWith("reservations")
    expect(mocks.in).toHaveBeenCalledWith("status", ["open", "contacted"])
    expect(orderedColumns()).toEqual(["requested_date", "created_at"])
    expect(dateConstraints()).toEqual([])

    resetQuerySpies()
    queryResult = { data: [], error: null }
    await getEventInquiries({ status: "declined" })
    expect(mocks.in).toHaveBeenCalledWith("status", ["declined"])
    expect(orderedColumns()).toEqual(["requested_date", "created_at"])
    expect(dateConstraints()).toEqual([])

    resetQuerySpies()
    await getEventInquiries({ status: "closed" })
    expect(mocks.in).toHaveBeenCalledWith("status", ["closed"])
    expect(orderedColumns()).toEqual(["requested_date", "created_at"])
    expect(dateConstraints()).toEqual([])

    resetQuerySpies()
    await getEventInquiries({ status: "all" })
    expect(mocks.in).not.toHaveBeenCalled()
    expect(mocks.eq).not.toHaveBeenCalled()
    expect(orderedColumns()).toEqual(["requested_date", "created_at"])
    expect(dateConstraints()).toEqual([])

    resetQuerySpies()
    mocks.createServiceClient.mockClear()
    mocks.requireStaffUser.mockResolvedValue(null)
    const unauthorized = await getEventInquiries()
    expect(unauthorized).toEqual({
      inquiries: [],
      error: "Unauthorized.",
    })
    expect(mocks.from).not.toHaveBeenCalled()
    expect(mocks.createServiceClient).not.toHaveBeenCalled()

    mocks.requireStaffUser.mockResolvedValue({ id: "staff-1" })
    queryResult = {
      data: null,
      error: { message: "could not query event_inquiries" },
    }
    const queryFailed = await getEventInquiries()
    expect(queryFailed).toEqual({
      inquiries: [],
      error: "Could not load inquiries.",
    })

    queryResult = { data: [], error: null }
    const emptyOk = await getEventInquiries()
    expect(emptyOk).toEqual({ inquiries: [] })
    expect(emptyOk).not.toHaveProperty("error")

    const chrome = inquiriesChromeSource()
    expect(chrome).toMatch(/\bgetEventInquiries\s*\(/)
    expect(chrome).toMatch(/\.inquiries\b/)
  })
})
