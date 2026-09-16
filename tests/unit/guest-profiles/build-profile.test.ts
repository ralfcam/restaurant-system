import { describe, expect, it } from "vitest"
import { buildGuestProfile, normalizeGuestEmail } from "@/lib/guest-profiles"

describe("normalizeGuestEmail", () => {
  it("normalizeGuestEmail matches trim+lowercase and drops blank emails", () => {
    expect(normalizeGuestEmail("  Ada@Ex.com ")).toBe("ada@ex.com")
    expect(normalizeGuestEmail(null)).toBeNull()
    expect(normalizeGuestEmail("")).toBeNull()
    expect(normalizeGuestEmail("   ")).toBeNull()
  })
})

describe("buildGuestProfile", () => {
  it("buildGuestProfile excludes other emails", () => {
    const reservations = [{ email: "ada@ex.com" }, { email: "ben@ex.com" }]
    const profile = buildGuestProfile("ada@ex.com", reservations)
    expect(
      profile.history.map((row: { email: string }) =>
        normalizeGuestEmail(row.email),
      ),
    ).toEqual(["ada@ex.com"])
  })

  it("completed reservations are visits and others are not", () => {
    const reservations = [
      { email: "ada@ex.com", status: "completed" },
      { email: "ada@ex.com", status: "confirmed" },
      { email: "ada@ex.com", status: "seated" },
      { email: "ada@ex.com", status: "cancelled" },
      { email: "ada@ex.com", status: "no_show" },
    ]
    const profile = buildGuestProfile(
      "ada@ex.com",
      reservations as Array<{ email: string }>,
    )
    const history = profile.history as Array<{
      status: string
      isVisit: boolean
    }>
    const completed = history.find((row) => row.status === "completed")
    const confirmed = history.find((row) => row.status === "confirmed")
    const seated = history.find((row) => row.status === "seated")
    const cancelled = history.find((row) => row.status === "cancelled")
    const noShow = history.find((row) => row.status === "no_show")

    expect(completed?.isVisit).toBe(true)
    expect(confirmed?.isVisit).toBe(false)
    expect(seated?.isVisit).toBe(false)
    expect(cancelled?.isVisit).toBe(false)
    expect(noShow?.isVisit).toBe(false)
  })

  it("history is newest date then time first", () => {
    const reservations = [
      { email: "ada@ex.com", date: "2026-09-10", time: "19:00" },
      { email: "ada@ex.com", date: "2026-09-20", time: "18:00" },
      { email: "ada@ex.com", date: "2026-09-20", time: "20:00" },
    ]
    const profile = buildGuestProfile(
      "ada@ex.com",
      reservations as Array<{ email: string }>,
    )
    expect(
      profile.history.map((row: { date: string; time: string }) => ({
        date: row.date,
        time: row.time,
      })),
    ).toEqual([
      { date: "2026-09-20", time: "20:00" },
      { date: "2026-09-20", time: "18:00" },
      { date: "2026-09-10", time: "19:00" },
    ])
  })

  it("displayed PII comes from the newest reservation", () => {
    const reservations = [
      {
        email: "  Ada@Ex.com ",
        date: "2026-09-10",
        time: "19:00",
        guest_name: "Old Ada",
        phone: "111",
        notes: "old notes",
      },
      {
        email: "Ada@Ex.com",
        date: "2026-09-20",
        time: "20:00",
        guest_name: "New Ada",
        phone: "333",
        notes: "new notes",
      },
      {
        email: "ada@ex.com",
        date: "2026-09-20",
        time: "18:00",
        guest_name: "Mid Ada",
        phone: "222",
        notes: "mid notes",
      },
    ]
    const profile = buildGuestProfile(
      "  Ada@Ex.com ",
      reservations as Array<{ email: string }>,
    ) as {
      guest_name: string
      email: string
      phone: string
      notes: string
    }

    expect(profile.guest_name).toBe("New Ada")
    expect(profile.phone).toBe("333")
    expect(profile.notes).toBe("new notes")
    expect(profile.email).toBe("ada@ex.com")
  })

  it("each history row has date time party_size status", () => {
    const reservations = [
      {
        email: "ada@ex.com",
        date: "2026-09-10",
        time: "19:00",
        party_size: 2,
        status: "completed",
      },
      {
        email: "ada@ex.com",
        date: "2026-09-20",
        time: "20:00",
        party_size: 4,
        status: "confirmed",
      },
    ]
    const profile = buildGuestProfile(
      "ada@ex.com",
      reservations as Array<{ email: string }>,
    )
    expect(
      profile.history.map(
        (row: {
          date: string
          time: string
          party_size: number
          status: string
        }) => ({
          date: row.date,
          time: row.time,
          party_size: row.party_size,
          status: row.status,
        }),
      ),
    ).toEqual([
      {
        date: "2026-09-20",
        time: "20:00",
        party_size: 4,
        status: "confirmed",
      },
      {
        date: "2026-09-10",
        time: "19:00",
        party_size: 2,
        status: "completed",
      },
    ])
  })

  it("empty matching set is empty not other guests", () => {
    const reservations = [{ email: "ada@ex.com" }, { email: "ben@ex.com" }]
    const profile = buildGuestProfile("nobody@ex.com", reservations)
    const emails = profile.history.map((row: { email: string }) =>
      normalizeGuestEmail(row.email),
    )
    expect(profile.history).toEqual([])
    expect(emails).toEqual([])
    expect(emails).not.toContain("ada@ex.com")
    expect(emails).not.toContain("ben@ex.com")
  })
})
