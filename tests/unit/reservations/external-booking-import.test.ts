import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"
import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  EMAIL_RE,
  PHONE_RE,
  validateReservationPayload,
} from "@/lib/reservations/validation"

const mocks = vi.hoisted(() => ({
  requireStaffUser: vi.fn(),
  createServiceClient: vi.fn(),
  from: vi.fn(),
  rpc: vi.fn(),
  getUser: vi.fn(),
  redirect: vi.fn(),
  sendBookingConfirmation: vi.fn(),
}))

vi.mock("@/lib/supabase/require-staff", () => ({
  requireStaffUser: mocks.requireStaffUser,
}))

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: (...args: unknown[]) =>
    mocks.createServiceClient(...args),
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: () => mocks.getUser() },
  }),
}))

vi.mock("next/navigation", () => ({
  redirect: (to: string) => mocks.redirect(to),
}))

vi.mock("next/cache", () => ({
  revalidatePath: () => undefined,
}))

vi.mock("@/lib/marketing/booking-confirmation", () => ({
  sendBookingConfirmation: mocks.sendBookingConfirmation,
}))

type ImportExternalReservations = (
  csvText: string,
) => Promise<{ error?: string }>

const validCsv = [
  "external_booking_id,guest_name,party_size,date,time,phone,email,notes",
  "ext-1,Ada,2,2026-10-10,18:00,5551234567,ada@example.com,",
].join("\n")

function serviceClient() {
  return { from: mocks.from, rpc: mocks.rpc }
}

async function settle(run: () => Promise<unknown>) {
  try {
    return { outcome: await run(), thrown: null as unknown }
  } catch (error) {
    return { outcome: undefined, thrown: error }
  }
}

describe("external booking import", () => {
  beforeEach(() => {
    mocks.requireStaffUser.mockReset()
    mocks.createServiceClient.mockReset()
    mocks.from.mockReset()
    mocks.rpc.mockReset()
    mocks.getUser.mockReset()
    mocks.redirect.mockReset()
    mocks.sendBookingConfirmation.mockReset()
    mocks.sendBookingConfirmation.mockResolvedValue(undefined)
    mocks.requireStaffUser.mockResolvedValue(null)
    mocks.getUser.mockResolvedValue({ data: { user: null } })
    mocks.rpc.mockResolvedValue({ data: null, error: null })
    mocks.from.mockImplementation(() => ({
      insert: async () => ({ error: null }),
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
      }),
    }))
    mocks.createServiceClient.mockReturnValue(serviceClient())
    mocks.redirect.mockImplementation((to: string) => {
      throw new Error(`NEXT_REDIRECT:${to}`)
    })
  })

  it("EI-1 staff gate and import control", async () => {
    const managerSource = readFileSync(
      path.join(process.cwd(), "components/staff/reservations-manager.tsx"),
      "utf8",
    )
    const actions = (await import("@/app/actions/reservations")) as {
      importExternalReservations?: ImportExternalReservations
    }
    expect({
      importControl: managerSource.includes('data-testid="reservation-import"'),
      importExternalReservations: typeof actions.importExternalReservations,
    }).toEqual({
      importControl: true,
      importExternalReservations: "function",
    })
    const importExternalReservations =
      actions.importExternalReservations as ImportExternalReservations

    mocks.requireStaffUser.mockResolvedValue(null)
    mocks.getUser.mockResolvedValue({ data: { user: null } })
    mocks.requireStaffUser.mockClear()
    mocks.createServiceClient.mockClear()
    mocks.rpc.mockClear()
    mocks.redirect.mockClear()
    await expect(importExternalReservations(validCsv)).rejects.toThrow(
      "NEXT_REDIRECT:/auth/login",
    )
    expect(mocks.requireStaffUser).toHaveBeenCalled()
    expect(mocks.createServiceClient).not.toHaveBeenCalled()
    expect(mocks.rpc.mock.calls.map((call) => call[0])).not.toContain(
      "import_external_reservations",
    )

    mocks.requireStaffUser.mockResolvedValue(null)
    mocks.getUser.mockResolvedValue({
      data: {
        user: {
          id: "guest-1",
          app_metadata: {},
          user_metadata: { role: "staff" },
        },
      },
    })
    mocks.requireStaffUser.mockClear()
    mocks.createServiceClient.mockClear()
    mocks.rpc.mockClear()
    mocks.redirect.mockClear()
    const refused = await settle(() => importExternalReservations(validCsv))
    expect(refused.thrown).toBeNull()
    const refusedError = (refused.outcome as { error?: string } | undefined)
      ?.error
    expect(refusedError).toEqual(expect.any(String))
    expect(refusedError).not.toBe("")
    expect(mocks.requireStaffUser).toHaveBeenCalled()
    expect(mocks.createServiceClient).not.toHaveBeenCalled()
    expect(mocks.rpc.mock.calls.map((call) => call[0])).not.toContain(
      "import_external_reservations",
    )

    const superAdmin = {
      id: "super-admin-1",
      app_metadata: { role: "super_admin" },
    }
    mocks.requireStaffUser.mockResolvedValue(superAdmin)
    mocks.getUser.mockResolvedValue({ data: { user: superAdmin } })
    mocks.requireStaffUser.mockClear()
    mocks.createServiceClient.mockClear()
    mocks.rpc.mockClear()
    await settle(() => importExternalReservations(validCsv))
    expect(mocks.requireStaffUser).toHaveBeenCalled()
    expect(mocks.createServiceClient).toHaveBeenCalled()
    expect(mocks.requireStaffUser.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.createServiceClient.mock.invocationCallOrder[0]!,
    )
  })

  it("EI-8 hidden id and guest insert cannot set it", () => {
    const baseline = readFileSync(
      path.join(
        process.cwd(),
        "supabase/migrations/00000000000000_baseline.sql",
      ),
      "utf8",
    )
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/--[^\n]*/g, "")
    const nullableTextColumn =
      /CREATE TABLE IF NOT EXISTS reservations \([\s\S]*?\bexternal_booking_id\s+TEXT\b(?!\s+NOT\s+NULL)[\s\S]*?\n\);/i.test(
        baseline,
      ) ||
      /ALTER TABLE reservations ADD COLUMN IF NOT EXISTS external_booking_id\s+TEXT\b(?!\s+NOT\s+NULL)/i.test(
        baseline,
      )
    expect(nullableTextColumn).toBe(true)
    expect(baseline).toMatch(
      /CREATE UNIQUE INDEX(?:\s+IF\s+NOT\s+EXISTS)?\s+\S+\s+ON\s+(?:public\.)?reservations\s*\(\s*external_booking_id\s*\)\s+WHERE\s+external_booking_id\s+IS\s+NOT\s+NULL\s*;/i,
    )

    const guestGrants = baseline.match(
      /GRANT INSERT \(([^)]+)\) ON TABLE reservations TO anon, authenticated/g,
    )
    expect(guestGrants).toEqual([
      "GRANT INSERT (guest_name, party_size, date, time, phone, email, notes, conf_code) ON TABLE reservations TO anon, authenticated",
    ])
    expect(guestGrants?.join("\n")).not.toMatch(/\bexternal_booking_id\b/)

    const managerSource = readFileSync(
      path.join(process.cwd(), "components/staff/reservations-manager.tsx"),
      "utf8",
    )
    const fichaSource = readFileSync(
      path.join(process.cwd(), "components/staff/guest-profile-panel.tsx"),
      "utf8",
    )
    expect(managerSource).not.toMatch(/\{[^}]*\bexternal_booking_id\b[^}]*\}/)
    expect(fichaSource).not.toMatch(/\{[^}]*\bexternal_booking_id\b[^}]*\}/)
  })

  it("EI-3 inserted row shape and no confirmation mail", async () => {
    const actions = (await import("@/app/actions/reservations")) as {
      importExternalReservations?: ImportExternalReservations
    }
    const importExternalReservations =
      actions.importExternalReservations as ImportExternalReservations
    const superAdmin = {
      id: "super-admin-1",
      app_metadata: { role: "super_admin" },
    }
    mocks.requireStaffUser.mockResolvedValue(superAdmin)
    mocks.getUser.mockResolvedValue({ data: { user: superAdmin } })
    mocks.rpc.mockClear()
    mocks.sendBookingConfirmation.mockClear()

    const trimmedCsv = [
      "external_booking_id,guest_name,party_size,date,time,phone,email,notes",
      "ext-1,  Ada  ,2,2026-10-10,18:00,  5551234567  ,  ada@example.com  ,  window  ",
    ].join("\n")
    await importExternalReservations(trimmedCsv)

    expect(mocks.rpc).toHaveBeenCalledTimes(1)
    const [trimmedRpcName, trimmedPayload] = mocks.rpc.mock.calls[0] as [
      string,
      { rows: Record<string, unknown>[] },
    ]
    expect(trimmedRpcName).toBe("import_external_reservations")
    expect(trimmedPayload.rows).toHaveLength(1)
    expect(trimmedPayload.rows[0]).toMatchObject({
      external_booking_id: "ext-1",
      guest_name: "Ada",
      party_size: 2,
      date: "2026-10-10",
      time: "18:00",
      phone: "5551234567",
      email: "ada@example.com",
      notes: "window",
      status: "confirmed",
      table_label: null,
    })
    expect(trimmedPayload.rows[0]?.conf_code).toMatch(/^TVL-\d{4}$/)
    expect(mocks.sendBookingConfirmation).not.toHaveBeenCalled()

    mocks.rpc.mockClear()
    mocks.sendBookingConfirmation.mockClear()
    const omittedCsv = [
      "external_booking_id,guest_name,party_size,date,time,phone,email,notes",
      "ext-9,,9,2026-10-11,19:30,,,",
    ].join("\n")
    await importExternalReservations(omittedCsv)

    expect(mocks.rpc).toHaveBeenCalledTimes(1)
    const [omittedRpcName, omittedPayload] = mocks.rpc.mock.calls[0] as [
      string,
      { rows: Record<string, unknown>[] },
    ]
    expect(omittedRpcName).toBe("import_external_reservations")
    expect(omittedPayload.rows).toHaveLength(1)
    expect(omittedPayload.rows[0]).toMatchObject({
      external_booking_id: "ext-9",
      guest_name: "",
      party_size: 9,
      date: "2026-10-11",
      time: "19:30",
      phone: "",
      email: null,
      notes: null,
      status: "confirmed",
      table_label: null,
    })
    expect(omittedPayload.rows[0]?.conf_code).toMatch(/^TVL-\d{4}$/)
    expect(mocks.sendBookingConfirmation).not.toHaveBeenCalled()

    expect(
      validateReservationPayload(
        {
          guestName: "Amelia Brooks",
          partySize: 9,
          date: "2026-10-10",
          time: "18:30",
          phone: "+1 (503) 555-0111",
          notes: "Window seat please",
          email: "guest@test.local",
        },
        "2026-10-03",
      ),
    ).not.toBeNull()
  })

  it("EI-4 existing id skipped, duplicate in file invalid", async () => {
    const actions = (await import("@/app/actions/reservations")) as {
      importExternalReservations?: ImportExternalReservations
    }
    const importExternalReservations =
      actions.importExternalReservations as ImportExternalReservations
    const superAdmin = {
      id: "super-admin-1",
      app_metadata: { role: "super_admin" },
    }
    mocks.requireStaffUser.mockResolvedValue(superAdmin)
    mocks.getUser.mockResolvedValue({ data: { user: superAdmin } })

    const insert = vi.fn(async () => ({ error: null }))
    const update = vi.fn(async () => ({ error: null }))
    const remove = vi.fn(async () => ({ error: null }))
    mocks.from.mockImplementation(() => ({
      insert,
      update,
      delete: remove,
    }))

    const duplicateCsv = [
      "external_booking_id,guest_name,party_size,date,time,phone,email,notes",
      "ext-1,Ada,2,2026-10-10,18:00,5551234567,ada@example.com,",
      "ext-1,Bea,3,2026-10-10,19:00,5557654321,bea@example.com,",
    ].join("\n")

    mocks.rpc.mockClear()
    mocks.from.mockClear()
    const duplicateResult = await importExternalReservations(duplicateCsv)
    expect(duplicateResult.error).toEqual(expect.any(String))
    expect(duplicateResult.error).not.toBe("")
    expect(mocks.rpc).not.toHaveBeenCalled()
    expect(insert).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
    expect(remove).not.toHaveBeenCalled()

    const existingCsv = [
      "external_booking_id,guest_name,party_size,date,time,phone,email,notes",
      "ext-existing,Ada,2,2026-10-10,18:00,5551234567,ada@example.com,",
    ].join("\n")
    mocks.rpc.mockResolvedValue({
      data: { inserted: 0, skipped: 1 },
      error: null,
    })
    mocks.rpc.mockClear()
    mocks.from.mockClear()
    const skipResult = await importExternalReservations(existingCsv)
    expect(mocks.rpc).toHaveBeenCalledTimes(1)
    const [rpcName, payload] = mocks.rpc.mock.calls[0] as [
      string,
      { rows: Record<string, unknown>[] },
    ]
    expect(rpcName).toBe("import_external_reservations")
    expect(payload.rows).toHaveLength(1)
    expect(payload.rows[0]?.external_booking_id).toBe("ext-existing")
    expect(skipResult).toEqual({ inserted: 0, skipped: 1 })
    expect(mocks.from).not.toHaveBeenCalled()
  })

  it("EI-5 one transaction writes nothing on failure", async () => {
    const actions = (await import("@/app/actions/reservations")) as {
      importExternalReservations?: ImportExternalReservations
    }
    const importExternalReservations =
      actions.importExternalReservations as ImportExternalReservations
    const superAdmin = {
      id: "super-admin-1",
      app_metadata: { role: "super_admin" },
    }
    mocks.requireStaffUser.mockResolvedValue(superAdmin)
    mocks.getUser.mockResolvedValue({ data: { user: superAdmin } })

    const insert = vi.fn(async () => ({ error: null }))
    const update = vi.fn(async () => ({ error: null }))
    const remove = vi.fn(async () => ({ error: null }))
    mocks.from.mockImplementation(() => ({
      insert,
      update,
      delete: remove,
    }))

    const mixedCsv = [
      "external_booking_id,guest_name,party_size,date,time,phone,email,notes",
      "ext-bad,Ada,0,2026-10-10,18:00,5551234567,ada@example.com,",
      "ext-ok,Bea,2,2026-10-11,19:00,5551234567,bea@example.com,",
    ].join("\n")

    mocks.rpc.mockClear()
    mocks.from.mockClear()
    insert.mockClear()
    update.mockClear()
    remove.mockClear()
    const mixedResult = await importExternalReservations(mixedCsv)
    expect(mixedResult.error).toEqual(expect.any(String))
    expect(mixedResult.error).not.toBe("")
    expect(mocks.rpc).not.toHaveBeenCalled()
    expect(insert).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
    expect(remove).not.toHaveBeenCalled()

    const blockedCsv = [
      "external_booking_id,guest_name,party_size,date,time,phone,email,notes",
      "ext-1,Ada,2,2026-10-10,18:00,5551234567,ada@example.com,",
    ].join("\n")
    mocks.rpc.mockClear()
    mocks.from.mockClear()
    insert.mockClear()
    update.mockClear()
    remove.mockClear()
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { message: "That date is blocked." },
    })
    const blockedResult = await importExternalReservations(blockedCsv)
    expect(blockedResult.error).toEqual(expect.any(String))
    expect(blockedResult.error).not.toBe("")
    const blockedInserted = (blockedResult as { inserted?: number }).inserted
    expect(blockedInserted === undefined || blockedInserted === 0).toBe(true)

    const existingCsv = [
      "external_booking_id,guest_name,party_size,date,time,phone,email,notes",
      "ext-a,Ada,2,2026-10-10,18:00,5551234567,ada@example.com,",
      "ext-b,Bea,2,2026-10-11,19:00,5551234567,bea@example.com,",
    ].join("\n")
    mocks.rpc.mockClear()
    mocks.from.mockClear()
    insert.mockClear()
    update.mockClear()
    remove.mockClear()
    mocks.rpc.mockResolvedValue({
      data: { inserted: 0, skipped: 2 },
      error: null,
    })
    const existingResult = await importExternalReservations(existingCsv)
    expect(mocks.rpc).toHaveBeenCalledTimes(1)
    expect(existingResult).toEqual({ inserted: 0, skipped: 2 })
    expect(mocks.from).not.toHaveBeenCalled()
  })

  it("EI-6 availability trigger has no import exception", async () => {
    const stripSqlComments = (sql: string) =>
      sql.replace(/\/\*[\s\S]*?\*\//g, "").replace(/--[^\n]*/g, "")
    const migrationsDir = path.join(process.cwd(), "supabase/migrations")
    const availabilityMarker =
      "CREATE OR REPLACE FUNCTION validate_reservation_availability"
    const availabilityFiles = readdirSync(migrationsDir)
      .filter((name) => name.endsWith(".sql"))
      .sort()
      .filter((name) =>
        stripSqlComments(
          readFileSync(path.join(migrationsDir, name), "utf8"),
        ).includes(availabilityMarker),
      )
    expect(availabilityFiles.length).toBeGreaterThan(0)
    const latestAvailabilityFile =
      availabilityFiles[availabilityFiles.length - 1]!
    const latestSql = stripSqlComments(
      readFileSync(path.join(migrationsDir, latestAvailabilityFile), "utf8"),
    )
    const availabilityStart = latestSql.indexOf(availabilityMarker)
    const availabilityNext = latestSql.indexOf(
      "CREATE OR REPLACE FUNCTION",
      availabilityStart + availabilityMarker.length,
    )
    const availabilityBody = latestSql.slice(
      availabilityStart,
      availabilityNext === -1 ? undefined : availabilityNext,
    )
    expect(availabilityBody).not.toMatch(/external_booking_id/i)
    expect(availabilityBody).not.toMatch(/import_external_reservations/i)

    const baseline = stripSqlComments(
      readFileSync(
        path.join(migrationsDir, "00000000000000_baseline.sql"),
        "utf8",
      ),
    )
    const importMarker =
      "CREATE OR REPLACE FUNCTION import_external_reservations"
    expect(baseline).toContain(importMarker)
    const importStart = baseline.indexOf(importMarker)
    const importNext = baseline.indexOf(
      "CREATE OR REPLACE FUNCTION",
      importStart + importMarker.length,
    )
    const importRegion = baseline.slice(
      importStart,
      importNext === -1 ? undefined : importNext,
    )
    const quote = importRegion.match(/AS\s+(\$[A-Za-z0-9_]*\$)/)
    const quoteAt = quote?.index ?? -1
    const quoteClose =
      quote && quoteAt >= 0
        ? importRegion.indexOf(`${quote[1]};`, quoteAt + quote[0].length)
        : -1
    const importBody =
      quoteClose === -1 ? importRegion : importRegion.slice(0, quoteClose)
    expect(importBody).toMatch(/INSERT\s+INTO\s+(?:public\.)?reservations\b/)
    expect(importBody).not.toContain("EXCEPTION")

    const actions = (await import("@/app/actions/reservations")) as {
      importExternalReservations?: ImportExternalReservations
    }
    const importExternalReservations =
      actions.importExternalReservations as ImportExternalReservations
    const superAdmin = {
      id: "super-admin-1",
      app_metadata: { role: "super_admin" },
    }
    mocks.requireStaffUser.mockResolvedValue(superAdmin)
    mocks.getUser.mockResolvedValue({ data: { user: superAdmin } })
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { message: "That date is blocked." },
    })
    const blocked = await importExternalReservations(validCsv)
    expect(blocked.error).toEqual(expect.any(String))
    expect(blocked.error).not.toBe("")
    const inserted = (blocked as { inserted?: number }).inserted
    expect(inserted === undefined || inserted <= 0).toBe(true)
  })

  it("EI-2 bad file shape writes nothing", async () => {
    const actions = (await import("@/app/actions/reservations")) as {
      importExternalReservations?: ImportExternalReservations
    }
    const importExternalReservations =
      actions.importExternalReservations as ImportExternalReservations
    const superAdmin = {
      id: "super-admin-1",
      app_metadata: { role: "super_admin" },
    }
    mocks.requireStaffUser.mockResolvedValue(superAdmin)
    mocks.getUser.mockResolvedValue({ data: { user: superAdmin } })

    const header =
      "external_booking_id,guest_name,party_size,date,time,phone,email,notes"
    const badPhone = "123"
    const badEmail = "not-an-email"
    expect(PHONE_RE.test(badPhone)).toBe(false)
    expect(EMAIL_RE.test(badEmail)).toBe(false)

    const badFiles = [
      {
        name: "wrong header",
        csv: [
          "id,guest_name,party_size,date,time,phone,email,notes",
          "ext-1,Ada,2,2026-10-10,18:00,5551234567,ada@example.com,",
        ].join("\n"),
      },
      {
        name: "missing external_booking_id",
        csv: [
          header,
          ",Ada,2,2026-10-10,18:00,5551234567,ada@example.com,",
        ].join("\n"),
      },
      {
        name: "bad date",
        csv: [
          header,
          "ext-date,Ada,2,15/08/2026,18:00,5551234567,ada@example.com,",
        ].join("\n"),
      },
      {
        name: "bad time",
        csv: [
          header,
          "ext-time,Ada,2,2026-10-10,25:00,5551234567,ada@example.com,",
        ].join("\n"),
      },
      {
        name: "bad phone",
        csv: [
          header,
          `ext-phone,Ada,2,2026-10-10,18:00,${badPhone},ada@example.com,`,
        ].join("\n"),
      },
      {
        name: "bad email",
        csv: [
          header,
          `ext-email,Ada,2,2026-10-10,18:00,5551234567,${badEmail},`,
        ].join("\n"),
      },
      {
        name: "non-integer party",
        csv: [
          header,
          "ext-party,Ada,2.5,2026-10-10,18:00,5551234567,ada@example.com,",
        ].join("\n"),
      },
    ]

    for (const { name, csv } of badFiles) {
      mocks.rpc.mockClear()
      const result = await importExternalReservations(csv)
      expect({ case: name, rpcCalls: mocks.rpc.mock.calls.length }).toEqual({
        case: name,
        rpcCalls: 0,
      })
      expect(result.error).toEqual(expect.any(String))
      expect(result.error).not.toBe("")
    }

    mocks.rpc.mockClear()
    const validBlank = [header, "ext-ok,Ada,2,2026-10-10,18:00,,"].join("\n")
    await importExternalReservations(validBlank)
    expect(mocks.rpc).toHaveBeenCalledTimes(1)
  })

  it("EI-7 result counts and list shows imported rows", async () => {
    const actions = (await import("@/app/actions/reservations")) as {
      importExternalReservations?: ImportExternalReservations
    }
    const importExternalReservations =
      actions.importExternalReservations as ImportExternalReservations
    const superAdmin = {
      id: "super-admin-1",
      app_metadata: { role: "super_admin" },
    }
    mocks.requireStaffUser.mockResolvedValue(superAdmin)
    mocks.getUser.mockResolvedValue({ data: { user: superAdmin } })
    mocks.rpc.mockResolvedValue({
      data: { inserted: 2, skipped: 1 },
      error: null,
    })

    const result = await importExternalReservations(validCsv)
    expect(result).toEqual({ inserted: 2, skipped: 1 })

    const managerSource = readFileSync(
      path.join(process.cwd(), "components/staff/reservations-manager.tsx"),
      "utf8",
    )
    const resultMarker = 'data-testid="reservation-import-result"'
    expect(managerSource.includes(resultMarker)).toBe(true)
    const resultAt = managerSource.indexOf(resultMarker)
    const resultRegion = managerSource.slice(
      Math.max(0, resultAt - 800),
      resultAt + 800,
    )
    expect(resultRegion).toMatch(/\binserted\b/)
    expect(resultRegion).toMatch(/\bskipped\b/)

    const mapper = managerSource.slice(
      managerSource.indexOf("function rowToReservation"),
      managerSource.indexOf("type Tab"),
    )
    expect(mapper).not.toMatch(/\.filter\([\s\S]*\bexternal_booking_id\b/)
    for (const call of [
      "initialReservations.map(rowToReservation)",
      "result.reservations.map(rowToReservation)",
    ]) {
      const at = managerSource.indexOf(call)
      expect(at).toBeGreaterThanOrEqual(0)
      const around = managerSource.slice(
        Math.max(0, at - 200),
        at + call.length,
      )
      expect(around).not.toMatch(/\.filter\([\s\S]*\bexternal_booking_id\b/)
    }
    const filteredBlock = managerSource.slice(
      managerSource.indexOf("const filtered = useMemo"),
      managerSource.indexOf("async function assignTable"),
    )
    expect(filteredBlock).not.toMatch(
      /\.filter\([\s\S]*\bexternal_booking_id\b/,
    )

    const baseline = readFileSync(
      path.join(
        process.cwd(),
        "supabase/migrations/00000000000000_baseline.sql",
      ),
      "utf8",
    )
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/--[^\n]*/g, "")
    expect(baseline).toContain(
      "GRANT INSERT (guest_name, party_size, date, time, phone, email, notes, conf_code) ON TABLE reservations TO anon, authenticated",
    )
    const guestGrants = baseline.match(
      /GRANT INSERT \(([^)]+)\) ON TABLE reservations TO anon, authenticated/g,
    )
    expect(guestGrants).toEqual([
      "GRANT INSERT (guest_name, party_size, date, time, phone, email, notes, conf_code) ON TABLE reservations TO anon, authenticated",
    ])
  })
})
