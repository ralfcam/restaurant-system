import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { beforeEach, describe, expect, it, vi } from "vitest"

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

type InquiryActionResult = { error?: string }

type InquiryActions = {
  getEventInquiries: () => Promise<InquiryActionResult>
  createInquiry: (
    input: Record<string, unknown>,
  ) => Promise<InquiryActionResult>
  updateInquiryStatus: (
    id: string,
    status: string,
  ) => Promise<InquiryActionResult>
}

function thenable<T>(value: T) {
  const builder: Record<string, unknown> = {}
  const self = new Proxy(builder, {
    get(target, prop) {
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
const inquiriesPage = path.join(root, "app/admin/inquiries/page.tsx")

const inquiryDraft = {
  guest_name: "Ada Lovelace",
  requested_date: "2026-09-20",
  party_size: 12,
  email: "ada@example.com",
}

function read(rel: string) {
  return readFileSync(path.join(root, rel), "utf8")
}

function inquiryActionRuns(actions: InquiryActions) {
  return [
    () => actions.getEventInquiries(),
    () => actions.createInquiry(inquiryDraft),
    () =>
      actions.updateInquiryStatus(
        "11111111-1111-4111-8111-111111111111",
        "contacted",
      ),
  ]
}

describe("event inquiries staff gate", () => {
  beforeEach(() => {
    mocks.requireStaffUser.mockReset()
    mocks.createServiceClient.mockReset()
    mocks.from.mockReset()
    mocks.requireStaffUser.mockResolvedValue({ id: "staff-1" })
    mocks.from.mockImplementation(() => thenable({ data: [], error: null }))
    mocks.createServiceClient.mockReturnValue({ from: mocks.from })
  })

  it("staff inquiries is gated and linked from Service nav", async () => {
    expect(existsSync(inquiriesPage)).toBe(true)

    const shell = read("components/staff/staff-shell.tsx")
    expect(shell).toMatch(/href:\s*["']\/admin\/inquiries["']/)

    const serviceGroup =
      shell.match(
        /label:\s*["']Service["'][\s\S]*?\.includes\(\s*item\.href\s*\)/,
      )?.[0] ?? ""
    expect(serviceGroup).toMatch(/["']\/admin\/inquiries["']/)

    const actions = (await import("@/app/actions/inquiries")) as InquiryActions

    mocks.requireStaffUser.mockResolvedValue(null)
    for (const run of inquiryActionRuns(actions)) {
      mocks.createServiceClient.mockClear()
      const unauthorized = await run()
      expect(unauthorized).toMatchObject({
        error: "errors.inquiries.unauthorized",
      })
      expect(mocks.createServiceClient).not.toHaveBeenCalled()
    }

    for (const user of [{ id: "staff-1" }, { id: "super-admin-1" }]) {
      mocks.requireStaffUser.mockResolvedValue(user)
      for (const run of inquiryActionRuns(actions)) {
        mocks.createServiceClient.mockClear()
        const result = await run()
        expect(result.error).not.toBe("errors.inquiries.unauthorized")
        expect(mocks.createServiceClient).toHaveBeenCalled()
      }
    }
  })
})
