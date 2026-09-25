import { describe, expect, it } from "vitest"
import { coversFitSlotAndService } from "@/lib/reservations/operating-hours"

const dinnerAllowlist = [
  { time: "19:00", max_covers: 12 },
  { time: "20:00", max_covers: 12 },
] as const

describe("coversFitSlotAndService", () => {
  it("coversFitSlotAndService rejects over slot or service and accepts when both have room", () => {
    // BW-18: 8 occupying at 19:00 + party 6 > slot max 12.
    expect(
      coversFitSlotAndService({
        time: "19:00",
        partySize: 6,
        bookableSlots: dinnerAllowlist,
        serviceMaxCovers: null,
        occupyingCoversAtTime: 8,
        occupyingCoversInService: 8,
      }),
    ).toBe(false)

    // BW-19: 16 occupying in the service + party 6 > service max 20
    // (per-slot remaining would still allow).
    expect(
      coversFitSlotAndService({
        time: "19:00",
        partySize: 6,
        bookableSlots: [
          { time: "19:00", max_covers: 24 },
          { time: "20:00", max_covers: 24 },
        ],
        serviceMaxCovers: 20,
        occupyingCoversAtTime: 16,
        occupyingCoversInService: 16,
      }),
    ).toBe(false)

    // NULL / omitted maxima add no extra cap; empty list is not an allowlist.
    expect(
      coversFitSlotAndService({
        time: "19:00",
        partySize: 6,
        bookableSlots: [],
        serviceMaxCovers: null,
        occupyingCoversAtTime: 40,
        occupyingCoversInService: 40,
      }),
    ).toBe(true)

    // BW-18: non-empty allowlist that omits the candidate time.
    expect(
      coversFitSlotAndService({
        time: "19:30",
        partySize: 2,
        bookableSlots: dinnerAllowlist,
        serviceMaxCovers: null,
        occupyingCoversAtTime: 0,
        occupyingCoversInService: 0,
      }),
    ).toBe(false)

    // Slot remaining 4 ≥ 2 and service remaining 12 ≥ 2.
    expect(
      coversFitSlotAndService({
        time: "19:00",
        partySize: 2,
        bookableSlots: dinnerAllowlist,
        serviceMaxCovers: 20,
        occupyingCoversAtTime: 8,
        occupyingCoversInService: 8,
      }),
    ).toBe(true)
  })
})
