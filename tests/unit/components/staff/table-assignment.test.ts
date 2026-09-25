import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { ReservationTableOption } from "@/app/actions/reservations"

const mocks = vi.hoisted(() => ({
  assignReservationTable: vi.fn(),
  getReservationTables: vi.fn(),
  getReservationsByDate: vi.fn(),
  transitionReservationStatus: vi.fn(),
  undoReservationStatus: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
}))

vi.mock("@/app/actions/reservations", () => ({
  assignReservationTable: mocks.assignReservationTable,
  getReservationTables: mocks.getReservationTables,
  getReservationsByDate: mocks.getReservationsByDate,
  transitionReservationStatus: mocks.transitionReservationStatus,
  undoReservationStatus: mocks.undoReservationStatus,
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mocks.push,
    refresh: mocks.refresh,
  }),
}))

import { TableAssignment } from "@/components/staff/reservations-manager"

type StaffReservation = {
  id: string
  guestName: string
  partySize: number
  time: string
  date: string
  tableLabel?: string
  status: "confirmed" | "seated" | "completed" | "cancelled" | "no_show"
  phone: string
  email: string | null
  confCode: string
}

const tables: ReservationTableOption[] = [
  { id: "t8", label: "8", seats: 8, status: "available" },
]

const occupancyWindow = {
  occupancyDurationMinutes: 90,
  safetyBufferMinutes: 15,
}

const candidate: StaffReservation = {
  id: "b",
  guestName: "Bea",
  partySize: 2,
  date: "2026-09-23",
  time: "12:00",
  status: "confirmed",
  phone: "555-0100",
  email: "bea@example.com",
  confCode: "BEA1",
}

function seatedClaim(tableLabel: string | undefined): StaffReservation {
  return {
    id: "a",
    guestName: "A",
    partySize: 2,
    date: "2026-09-23",
    time: "12:00",
    status: "seated",
    tableLabel,
    phone: "555-0101",
    email: "a@example.com",
    confCode: "AAA1",
  }
}

function dropdownMarkup(reservations: StaffReservation[]): string {
  return renderToStaticMarkup(
    createElement(TableAssignment, {
      reservation: candidate,
      tables,
      assigning: false,
      onAssign: () => {},
      reservations,
      occupancyWindow,
    }),
  )
}

describe("table assignment dropdown", () => {
  beforeEach(() => {
    mocks.getReservationTables.mockClear()
  })

  it("table assignment dropdown options follow the in-memory reservation list", () => {
    const occupying = seatedClaim("8")
    expect(dropdownMarkup([occupying, candidate])).not.toContain('value="8"')

    expect(
      dropdownMarkup([
        { ...occupying, status: "completed", tableLabel: "8" },
        candidate,
      ]),
    ).toContain('value="8"')

    expect(
      dropdownMarkup([
        { ...occupying, status: "seated", tableLabel: undefined },
        candidate,
      ]),
    ).toContain('value="8"')

    expect(mocks.getReservationTables).not.toHaveBeenCalled()
  })
})
