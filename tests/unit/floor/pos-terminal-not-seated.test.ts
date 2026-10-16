// @vitest-environment happy-dom
import {
  act,
  createElement,
  type ComponentProps,
  type FunctionComponent,
} from "react"
import { createRoot, type Root } from "react-dom/client"
import { createTranslator, NextIntlClientProvider } from "next-intl"
import { afterEach, describe, expect, it, vi } from "vitest"
import en from "@/messages/en.json"
import { MENUS } from "@/lib/data"
import type { MenuItemRow } from "@/app/actions/menu"
import type { PersistedServer, PersistedTable } from "@/app/actions/operations"

const mocks = vi.hoisted(() => ({
  createKitchenOrder: vi.fn(),
}))

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))

vi.mock("@/app/actions/operations", () => ({
  createKitchenOrder: mocks.createKitchenOrder,
}))

import { toast } from "sonner"
import { PosTerminal } from "@/components/staff/pos-terminal"

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

const TABLE_LABEL = "12"
const ITEM_NAME = "Probe tartare"
const SERVER_NAME = "Maya"

const t = createTranslator({ locale: "en", messages: en })
const seatedTitle = t("staff.pos.tableNotSeatedTitle", { label: TABLE_LABEL })
const seatedDescription = t("staff.pos.tableNotSeatedDescription")
const sendFailed = t("staff.pos.sendFailed")

const tables: PersistedTable[] = [
  {
    id: "table-12",
    label: TABLE_LABEL,
    seats: 4,
    status: "available",
    expectedMinutes: 90,
    x: 0,
    y: 0,
    shape: "square",
    mergeId: null,
  },
]

const servers: PersistedServer[] = [{ id: "server-maya", name: SERVER_NAME }]

const items: MenuItemRow[] = [
  {
    id: "item-probe",
    slug: "probe-tartare",
    name: ITEM_NAME,
    name_en: ITEM_NAME,
    description: "Probe dish",
    description_en: "Probe dish",
    price: "18.-",
    price_value: 18,
    menu_id: MENUS[0]?.id ?? "midi",
    section: "Plats",
    section_en: "Mains",
    popular: false,
    available: true,
    sort_order: 0,
    created_at: "2026-10-15T00:00:00.000Z",
  },
]

let mountedRoot: Root | undefined

function buttonByText(text: string): HTMLButtonElement {
  const button = [...document.querySelectorAll("button")].find((element) =>
    element.textContent?.includes(text),
  )
  expect(button, text).toBeInstanceOf(HTMLButtonElement)
  return button as HTMLButtonElement
}

function cartLineNames(): string[] {
  return [...document.querySelectorAll("ul li")].map(
    (line) => line.querySelector("p")?.textContent?.trim() ?? "",
  )
}

function renderTerminal() {
  const container = document.createElement("div")
  document.body.appendChild(container)
  mountedRoot = createRoot(container)
  act(() => {
    mountedRoot!.render(
      createElement(
        NextIntlClientProvider as FunctionComponent<
          Omit<ComponentProps<typeof NextIntlClientProvider>, "children">
        >,
        { locale: "en", messages: en },
        createElement(PosTerminal, { tables, servers, items }),
      ),
    )
  })
}

async function addProbeItem() {
  await act(async () => {
    buttonByText(ITEM_NAME).click()
  })
}

async function clickSend() {
  await act(async () => {
    buttonByText(en.staff.pos.send).click()
    await Promise.resolve()
  })
}

describe("PosTerminal", () => {
  afterEach(() => {
    if (mountedRoot) {
      act(() => {
        mountedRoot!.unmount()
      })
      mountedRoot = undefined
    }
    document.body.replaceChildren()
    mocks.createKitchenOrder.mockReset()
    vi.mocked(toast.error).mockClear()
    vi.mocked(toast.success).mockClear()
  })

  it("PosTerminal maps a not-seated refusal to the specific toast and keeps the order", async () => {
    mocks.createKitchenOrder.mockResolvedValueOnce({
      error: "errors.pos.tableNotSeated",
    })
    renderTerminal()
    await addProbeItem()
    expect(cartLineNames()).toEqual([ITEM_NAME])

    await clickSend()

    expect(mocks.createKitchenOrder).toHaveBeenCalledTimes(1)
    expect(seatedTitle).toContain(TABLE_LABEL)
    expect(toast.error).toHaveBeenCalledWith(seatedTitle, {
      description: seatedDescription,
    })
    expect(toast.error).not.toHaveBeenCalledWith(sendFailed)
    expect(toast.success).not.toHaveBeenCalled()
    expect(cartLineNames()).toEqual([ITEM_NAME])
    expect(buttonByText(en.staff.pos.send).disabled).toBe(false)

    vi.mocked(toast.error).mockClear()
    vi.mocked(toast.success).mockClear()
    mocks.createKitchenOrder.mockRejectedValueOnce(new Error("network"))
    await clickSend()
    expect(toast.error).toHaveBeenCalledWith(sendFailed)
    expect(toast.success).not.toHaveBeenCalled()

    vi.mocked(toast.error).mockClear()
    mocks.createKitchenOrder.mockResolvedValueOnce({
      error: "errors.pos.tableAmbiguousVisit",
    })
    await clickSend()
    expect(toast.error).toHaveBeenCalledWith(sendFailed)
    expect(toast.success).not.toHaveBeenCalled()
  })
})
