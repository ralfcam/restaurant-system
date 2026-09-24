import { readFileSync } from "node:fs"
import path from "node:path"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  requireStaffUser: vi.fn(),
  createServiceClient: vi.fn(),
  from: vi.fn(),
  insert: vi.fn(),
}))

vi.mock("@/lib/supabase/require-staff", () => ({
  requireStaffUser: mocks.requireStaffUser,
}))

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: (...args: unknown[]) =>
    mocks.createServiceClient(...args),
}))

type InquiryResult = { error?: string }

type CreateInquiry = (input: Record<string, unknown>) => Promise<InquiryResult>

function regexLiteral(name: "PHONE_RE" | "EMAIL_RE"): RegExp {
  const src = readFileSync(
    path.join(process.cwd(), "lib/reservations/validation.ts"),
    "utf8",
  )
  const match = src.match(
    new RegExp(String.raw`(?:export\s+)?const ${name} = /(.+)/`),
  )
  if (!match) {
    throw new Error(`${name} missing from lib/reservations/validation.ts`)
  }
  return new RegExp(match[1])
}

function insertedRow() {
  const payload = mocks.insert.mock.calls[0]?.[0] as
    Record<string, unknown> | Record<string, unknown>[] | undefined
  return (Array.isArray(payload) ? payload[0] : payload) ?? {}
}

describe("createInquiry", () => {
  beforeEach(() => {
    mocks.requireStaffUser.mockReset()
    mocks.createServiceClient.mockReset()
    mocks.from.mockReset()
    mocks.insert.mockReset()
    mocks.requireStaffUser.mockResolvedValue({ id: "staff-1" })
    mocks.insert.mockResolvedValue({ error: null })
    mocks.from.mockImplementation(() => ({ insert: mocks.insert }))
    mocks.createServiceClient.mockReturnValue({ from: mocks.from })
  })

  it("staff createInquiry persists open inquiry and rejects invalid contact", async () => {
    const phoneRe = regexLiteral("PHONE_RE")
    const emailRe = regexLiteral("EMAIL_RE")
    const validEmail = "ada@example.com"
    const validPhone = "(503) 555-0111"
    const badEmail = "ada@localhost"
    const badPhone = "abc"
    expect(emailRe.test(validEmail)).toBe(true)
    expect(phoneRe.test(validPhone)).toBe(true)
    expect(emailRe.test(badEmail)).toBe(false)
    expect(phoneRe.test(badPhone)).toBe(false)

    const { createInquiry } = (await import("@/app/actions/inquiries")) as {
      createInquiry: CreateInquiry
    }

    const draft = {
      guest_name: "Ada Lovelace",
      requested_date: "2026-09-20",
      party_size: 9,
      email: validEmail,
    }

    mocks.requireStaffUser.mockResolvedValue(null)
    const unauthorized = await createInquiry(draft)
    expect(unauthorized).toMatchObject({
      error: "errors.inquiries.unauthorized",
    })
    expect(mocks.insert).not.toHaveBeenCalled()
    expect(mocks.from).not.toHaveBeenCalled()

    mocks.requireStaffUser.mockResolvedValue({ id: "staff-1" })

    const invalidCases: Record<string, unknown>[] = [
      { ...draft, guest_name: "   " },
      { ...draft, email: "", phone: "  " },
      { ...draft, email: badEmail, phone: "" },
      { ...draft, email: "", phone: badPhone },
    ]
    for (const input of invalidCases) {
      mocks.insert.mockClear()
      mocks.from.mockClear()
      const rejected = await createInquiry(input)
      expect(rejected.error).toBeTruthy()
      expect(rejected.error).not.toBe("errors.inquiries.unauthorized")
      expect(mocks.insert).not.toHaveBeenCalled()
    }

    mocks.insert.mockClear()
    mocks.from.mockClear()
    const emailOnly = await createInquiry({
      guest_name: "  Ada Lovelace  ",
      requested_date: "2026-09-20",
      party_size: 9,
      email: `  ${validEmail}  `,
    })
    expect(emailOnly.error).toBeUndefined()
    expect(mocks.from).toHaveBeenCalledWith("event_inquiries")
    expect(mocks.from).not.toHaveBeenCalledWith("reservations")
    expect(mocks.insert).toHaveBeenCalledTimes(1)
    const emailRow = insertedRow()
    expect(emailRow.guest_name).toBe("Ada Lovelace")
    expect(emailRow.requested_date).toBe("2026-09-20")
    expect(emailRow.party_size).toBe(9)
    expect(emailRow.email).toBe(validEmail)
    expect(emailRow.status === undefined || emailRow.status === "open").toBe(
      true,
    )
    expect(emailRow.kind === undefined || emailRow.kind === null).toBe(true)

    mocks.insert.mockClear()
    mocks.from.mockClear()
    const phoneOnly = await createInquiry({
      guest_name: "Ada Lovelace",
      requested_date: "2026-09-20",
      party_size: 9,
      phone: validPhone,
    })
    expect(phoneOnly.error).toBeUndefined()
    expect(mocks.from).toHaveBeenCalledWith("event_inquiries")
    expect(mocks.from).not.toHaveBeenCalledWith("reservations")
    expect(mocks.insert).toHaveBeenCalledTimes(1)
    const phoneRow = insertedRow()
    expect(phoneRow.phone).toBe(validPhone)
    expect(phoneRow.party_size).toBe(9)
    expect(phoneRow.status === undefined || phoneRow.status === "open").toBe(
      true,
    )

    mocks.insert.mockClear()
    mocks.from.mockClear()
    const withKind = await createInquiry({
      ...draft,
      kind: "private_event",
    })
    expect(withKind.error).toBeUndefined()
    expect(mocks.from).toHaveBeenCalledWith("event_inquiries")
    expect(mocks.from).not.toHaveBeenCalledWith("reservations")
    expect(insertedRow().kind).toBe("private_event")
  })
})
