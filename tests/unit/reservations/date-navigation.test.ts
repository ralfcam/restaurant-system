// @vitest-environment happy-dom
import { spawnSync } from "node:child_process"
import { readFileSync } from "node:fs"
import path from "node:path"
import {
  act,
  createElement,
  type ComponentProps,
  type FunctionComponent,
  type ReactNode,
} from "react"
import { createRoot, type Root } from "react-dom/client"
import { NextIntlClientProvider } from "next-intl"
import { afterEach, describe, expect, it, vi } from "vitest"
import en from "@/messages/en.json"
import type { ReservationRow } from "@/app/actions/reservations"

const mocks = vi.hoisted(() => ({
  getReservationsByDate: vi.fn(),
  getReservationTables: vi.fn(),
  assignReservationTable: vi.fn(),
  transitionReservationStatus: vi.fn(),
  undoReservationStatus: vi.fn(),
  importExternalReservations: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
}))

vi.mock("@/app/actions/reservations", () => ({
  getReservationsByDate: mocks.getReservationsByDate,
  getReservationTables: mocks.getReservationTables,
  assignReservationTable: mocks.assignReservationTable,
  transitionReservationStatus: mocks.transitionReservationStatus,
  undoReservationStatus: mocks.undoReservationStatus,
  importExternalReservations: mocks.importExternalReservations,
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mocks.push,
    refresh: mocks.refresh,
  }),
}))

vi.mock("next/link", async () => {
  const { createElement: h } = await import("react")
  return {
    default: ({ children, href }: { children?: ReactNode; href: string }) =>
      h("a", { href }, children),
  }
})

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))

import { ReservationsManager } from "@/components/staff/reservations-manager"

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

type DatedList = {
  reservations: ReservationRow[]
  error?: string
}

type Deferred<T> = {
  promise: Promise<T>
  resolve: (value: T) => void
}

function defer<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

const pendingByDate = new Map<string, Deferred<DatedList>>()

function reservationRow(guestName: string, date: string): ReservationRow {
  return {
    id: guestName.toLowerCase().replaceAll(" ", "-"),
    guest_name: guestName,
    party_size: 2,
    date,
    time: "19:00",
    status: "confirmed",
    phone: "+41000000000",
    email: null,
    notes: null,
    table_label: null,
    conf_code: "TVL-1000",
    created_at: "2026-10-07T12:00:00.000Z",
    allergens: null,
  }
}

let mountedRoot: Root | undefined

function dateInput(): HTMLInputElement {
  const input = document.querySelector('input[type="date"]')
  expect(input).toBeInstanceOf(HTMLInputElement)
  return input as HTMLInputElement
}

function buttonNamed(name: string): HTMLButtonElement {
  const button = [...document.querySelectorAll("button")].find(
    (element) => element.getAttribute("title") === name,
  )
  expect(button, name).toBeInstanceOf(HTMLButtonElement)
  return button as HTMLButtonElement
}

const root = process.cwd()

function read(rel: string) {
  return readFileSync(path.join(root, rel), "utf8")
}

function functionSource(source: string, name: string): string {
  const start = source.indexOf(`function ${name}`)
  const open = source.indexOf("{", start)
  if (start < 0 || open < 0) return ""
  let depth = 0
  for (let i = open; i < source.length; i++) {
    const ch = source[i]
    if (ch === "{") depth += 1
    else if (ch === "}") {
      depth -= 1
      if (depth === 0) return source.slice(start, i + 1)
    }
  }
  return ""
}

function buttonElement(source: string, titleKey: string): string {
  const titleAt = source.indexOf(titleKey)
  const buttonAt = source.lastIndexOf("<Button", titleAt)
  const closeAt = source.indexOf("</Button>", titleAt)
  if (titleAt < 0 || buttonAt < 0 || closeAt < 0) return ""
  return source.slice(buttonAt, closeAt)
}

describe("reservation date navigation", () => {
  it("previous and next move one calendar day in a positive UTC offset", () => {
    const timezonePath = path.join(root, "lib/timezone.ts")
    const child = `
      import { pathToFileURL } from "node:url"
      const href = pathToFileURL(${JSON.stringify(timezonePath)}).href
      const { shiftCalendarDate } = await import(href)
      if (typeof shiftCalendarDate !== "function") {
        console.error("missing export shiftCalendarDate")
        process.exit(1)
      }
      const next = shiftCalendarDate("2026-10-07", 1)
      const prev = shiftCalendarDate("2026-10-07", -1)
      if (next !== "2026-10-08" || prev !== "2026-10-06") {
        console.error(
          "shiftCalendarDate mismatch " + JSON.stringify({ next, prev }),
        )
        process.exit(1)
      }
    `
    const result = spawnSync(
      process.execPath,
      ["--experimental-strip-types", "--input-type=module", "-e", child],
      {
        env: { ...process.env, TZ: "Europe/Zurich" },
        encoding: "utf8",
      },
    )
    expect(
      result.status,
      `${result.stdout ?? ""}\n${result.stderr ?? ""}\n${result.error?.message ?? ""}`,
    ).toBe(0)

    const manager = read("components/staff/reservations-manager.tsx")

    expect(manager).toMatch(
      /onClick=\{\(\)\s*=>\s*navigateToDate\(shiftCalendarDate\([^,]+,\s*-1\)\)\}/,
    )
    expect(manager).toMatch(
      /onClick=\{\(\)\s*=>\s*navigateToDate\(shiftCalendarDate\([^,]+,\s*1\)\)\}/,
    )
    expect(manager).not.toMatch(/\boffsetDate\b/)
    expect(manager).not.toMatch(/["']T00:00:00["']/)

    const navigateToDate = functionSource(manager, "navigateToDate")
    const assign = /set([A-Z]\w*)\(\s*date\s*\)/.exec(navigateToDate)
    expect(
      assign,
      "navigateToDate must assign the date-input state",
    ).not.toBeNull()
    const pushAt = navigateToDate.indexOf("router.push")
    expect(pushAt).toBeGreaterThan(assign!.index)

    const stateName = assign![1].charAt(0).toLowerCase() + assign![1].slice(1)
    const typeAt = manager.indexOf('type="date"')
    const inputAt = manager.lastIndexOf("<input", typeAt)
    const inputEnd = manager.indexOf("/>", typeAt)
    const dateInput = manager.slice(inputAt, inputEnd)
    expect(dateInput).toMatch(new RegExp(`value=\\{${stateName}\\}`))

    for (const titleKey of [
      "staff.reservations.previousDay",
      "staff.reservations.nextDay",
    ]) {
      expect(buttonElement(manager, titleKey)).not.toMatch(
        /disabled=\{isPending\}/,
      )
    }
  })

  afterEach(() => {
    if (mountedRoot) {
      act(() => {
        mountedRoot!.unmount()
      })
      mountedRoot = undefined
    }
    document.body.replaceChildren()
    pendingByDate.clear()
  })

  it("a stale reservations response does not replace the latest date", async () => {
    pendingByDate.clear()
    mocks.getReservationsByDate.mockImplementation((date: string) => {
      const pending = defer<DatedList>()
      pendingByDate.set(date, pending)
      return pending.promise
    })
    mocks.getReservationTables.mockResolvedValue([])

    const container = document.createElement("div")
    document.body.appendChild(container)
    mountedRoot = createRoot(container)

    await act(async () => {
      mountedRoot!.render(
        createElement(
          NextIntlClientProvider as FunctionComponent<
            Omit<ComponentProps<typeof NextIntlClientProvider>, "children">
          >,
          {
            locale: "en",
            messages: en,
            timeZone: "Europe/Zurich",
          },
          createElement(ReservationsManager, {
            selectedDate: "2026-10-07",
            today: "2026-10-07",
            initialReservations: [],
            occupancyWindow: {
              occupancyDurationMinutes: 90,
              safetyBufferMinutes: 15,
            },
          }),
        ),
      )
    })

    const october7 = pendingByDate.get("2026-10-07")
    expect(october7, "mount holds the 2026-10-07 list").toBeDefined()

    await act(async () => {
      buttonNamed("Next day").click()
    })

    expect(dateInput().value).toBe("2026-10-08")
    expect(mocks.getReservationsByDate).toHaveBeenCalledWith("2026-10-08")

    const october8 = pendingByDate.get("2026-10-08")
    expect(october8, "latest date is fetched").toBeDefined()
    await act(async () => {
      october8!.resolve({
        reservations: [reservationRow("Fresh Guest", "2026-10-08")],
      })
      await Promise.resolve()
    })

    await act(async () => {
      october7!.resolve({
        reservations: [reservationRow("Stale Guest", "2026-10-07")],
        error: undefined,
      })
      await Promise.resolve()
    })

    expect(document.body.textContent).toContain("Fresh Guest")
    expect(document.body.textContent).not.toContain("Stale Guest")
  })
})
