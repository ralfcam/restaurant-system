import { isValidElement, type ReactElement, type ReactNode } from "react"
import { jsx } from "react/jsx-runtime"
import { renderToStaticMarkup } from "react-dom/server"
import { NextIntlClientProvider } from "next-intl"
import { describe, expect, it, vi } from "vitest"
import en from "@/messages/en.json"
import type { OperatingDay } from "@/lib/reservations/operating-hours"

const mocks = vi.hoisted(() => ({
  getAllOperatingWindows: vi.fn(),
  getBlockedDatesInRange: vi.fn(),
  upsertOperatingWindows: vi.fn(),
  toggleBlockedDate: vi.fn(),
  getAuthUser: vi.fn(),
  signOut: vi.fn(),
  getRestaurantInfoBar: vi.fn(),
  updateRestaurantContactInfo: vi.fn(),
  getTranslations: vi.fn(),
  getSlotIntervalMinutes: vi.fn(),
}))

vi.mock("@/app/actions/availability", () => ({
  getAllOperatingWindows: mocks.getAllOperatingWindows,
  getBlockedDatesInRange: mocks.getBlockedDatesInRange,
  upsertOperatingWindows: mocks.upsertOperatingWindows,
  toggleBlockedDate: mocks.toggleBlockedDate,
}))

vi.mock("@/app/actions/auth", () => ({
  getAuthUser: mocks.getAuthUser,
  signOut: mocks.signOut,
}))

vi.mock("@/app/actions/restaurant-info", () => ({
  getRestaurantInfoBar: mocks.getRestaurantInfoBar,
  updateRestaurantContactInfo: mocks.updateRestaurantContactInfo,
}))

vi.mock("@/app/actions/branding", () => ({
  getSlotIntervalMinutes: mocks.getSlotIntervalMinutes,
}))

vi.mock("next-intl/server", () => ({
  getTranslations: mocks.getTranslations,
}))

import { SchedulingManager } from "@/components/staff/scheduling-manager"
import SchedulingPage from "@/app/admin/scheduling/page"

const SLOT_OFF_GRID =
  "Monday has a bookable slot that is not on the 30-minute grid."

function mondayAt1915(): OperatingDay[] {
  return [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) =>
    dayOfWeek === 1
      ? {
          day_of_week: dayOfWeek,
          is_closed: false,
          segments: [
            {
              opens_at: "18:00",
              closes_at: "22:00",
              label: "Dinner",
              sort_order: 0,
              bookable_slots: [{ time: "19:15" }],
            },
          ],
        }
      : { day_of_week: dayOfWeek, is_closed: true, segments: [] },
  )
}

function previewMarkup(slotIntervalMinutes: number): string {
  return renderToStaticMarkup(
    jsx(NextIntlClientProvider, {
      locale: "en",
      messages: en,
      timeZone: "Europe/Zurich",
      children: jsx(SchedulingManager, {
        initialOperatingWindows: mondayAt1915(),
        initialBlockedDates: [],
        initialAddress: "1 Main",
        initialPhone: "+1 555 0100",
        isSuperAdmin: true,
        slotIntervalMinutes,
      }),
    }),
  )
}

function saveChangesOpenTag(markup: string): string {
  const button = /<button\b[^>]*>[\s\S]*?Save Changes<\/button>/.exec(markup)
  expect(button).not.toBeNull()
  return button![0].slice(0, button![0].indexOf(">"))
}

function findSchedulingManager(node: ReactNode): ReactElement | null {
  if (!isValidElement(node)) return null
  if (node.type === SchedulingManager) return node
  const children = (node.props as { children?: ReactNode }).children
  const list = Array.isArray(children)
    ? children
    : children != null
      ? [children]
      : []
  for (const child of list) {
    const found = findSchedulingManager(child)
    if (found) return found
  }
  return null
}

describe("CL-1 interval preview", () => {
  it("Save preview validates on the configured interval", async () => {
    const onFifteen = previewMarkup(15)
    expect(onFifteen).not.toContain(SLOT_OFF_GRID)
    expect(onFifteen).not.toMatch(/not on the \d+-minute grid/)
    expect(saveChangesOpenTag(onFifteen)).not.toMatch(/\sdisabled(?:=|\s|>)/)

    const onThirty = previewMarkup(30)
    expect(onThirty).toContain(SLOT_OFF_GRID)

    mocks.getTranslations.mockResolvedValue((key: string) => key)
    mocks.getAllOperatingWindows.mockResolvedValue(mondayAt1915())
    mocks.getBlockedDatesInRange.mockResolvedValue([])
    mocks.getAuthUser.mockResolvedValue({
      email: "host@example.com",
      app_metadata: { role: "super_admin" },
    })
    mocks.getRestaurantInfoBar.mockResolvedValue({
      hours: "Mon",
      address: "1 Main",
      phone: "+1 555 0100",
    })
    mocks.getSlotIntervalMinutes.mockResolvedValue(15)

    const page = await SchedulingPage()
    const manager = findSchedulingManager(page)
    expect(manager).not.toBeNull()
    expect(
      (manager!.props as { slotIntervalMinutes?: number }).slotIntervalMinutes,
    ).toBe(15)
  })
})
