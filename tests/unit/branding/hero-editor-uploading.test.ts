// @vitest-environment happy-dom
import {
  act,
  createElement,
  type ComponentProps,
  type FunctionComponent,
} from "react"
import { createRoot, type Root } from "react-dom/client"
import { NextIntlClientProvider } from "next-intl"
import { afterEach, describe, expect, it, vi } from "vitest"
import en from "@/messages/en.json"

const mocks = vi.hoisted(() => ({
  uploadRestaurantHeroImage: vi.fn(),
  removeRestaurantHeroImage: vi.fn(),
  mutate: vi.fn(),
}))

vi.mock("@/app/actions/branding", () => ({
  uploadRestaurantHeroImage: mocks.uploadRestaurantHeroImage,
  removeRestaurantHeroImage: mocks.removeRestaurantHeroImage,
}))

vi.mock("@/hooks/use-restaurant-hero-image", () => ({
  useRestaurantHeroImage: () => ({
    heroImageUrl: "https://example.test/current-hero.jpg",
    mutate: mocks.mutate,
  }),
}))

vi.mock("next/image", async () => {
  const { createElement: h } = await import("react")
  return {
    default: ({
      alt,
      src,
      className,
    }: {
      alt?: string
      src?: string
      className?: string
    }) => h("img", { alt, src, className }),
  }
})

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))

import { RestaurantHeroImageEditor } from "@/components/staff/restaurant-hero-image-editor"

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

let mountedRoot: Root | undefined
let editorContainer: HTMLElement | undefined
let resolveUpload: (value: { heroImageUrl: string }) => void = () => {}

function stubObjectUrls() {
  if (typeof URL.createObjectURL !== "function") {
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      writable: true,
      value: () => "blob:hero-preview",
    })
  }
  if (typeof URL.revokeObjectURL !== "function") {
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      writable: true,
      value: () => {},
    })
  }
  vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:hero-preview")
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {})
}

function fileInput(): HTMLInputElement {
  const input = document.getElementById("hero-image-upload-input")
  expect(input).toBeInstanceOf(HTMLInputElement)
  return input as HTMLInputElement
}

function selectFile(input: HTMLInputElement, file: File) {
  const files = {
    0: file,
    length: 1,
    item: (index: number) => (index === 0 ? file : null),
  }
  Object.defineProperty(input, "files", {
    configurable: true,
    value: files,
  })
  input.dispatchEvent(new Event("change", { bubbles: true }))
}

function buttonByLabel(label: string): HTMLButtonElement {
  const button = [...document.querySelectorAll("button")].find((element) =>
    element.textContent?.includes(label),
  )
  expect(button, label).toBeInstanceOf(HTMLButtonElement)
  return button as HTMLButtonElement
}

function renderEditor() {
  const container = document.createElement("div")
  document.body.appendChild(container)
  editorContainer = container
  mountedRoot = createRoot(container)
  act(() => {
    mountedRoot!.render(
      createElement(
        NextIntlClientProvider as FunctionComponent<
          Omit<ComponentProps<typeof NextIntlClientProvider>, "children">
        >,
        { locale: "en", messages: en },
        createElement(RestaurantHeroImageEditor, { isSuperAdmin: true }),
      ),
    )
  })
}

async function flushTurn() {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0)
    })
  })
}

describe("RestaurantHeroImageEditor", () => {
  afterEach(() => {
    if (mountedRoot) {
      act(() => {
        mountedRoot!.unmount()
      })
      mountedRoot = undefined
    }
    editorContainer = undefined
    document.body.replaceChildren()
    resolveUpload = () => {}
  })

  it("hero editor shows an uploading state and blocks double submit while saving", async () => {
    stubObjectUrls()
    mocks.uploadRestaurantHeroImage.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveUpload = resolve
        }),
    )
    renderEditor()

    const valid = new File([new Uint8Array(1024)], "small.png", {
      type: "image/png",
    })
    expect(valid.size).toBe(1024)

    const input = fileInput()
    await act(async () => {
      selectFile(input, valid)
    })

    const save = buttonByLabel(en.staff.branding.saveHero)
    expect(save.disabled).toBe(false)
    await act(async () => {
      save.click()
    })

    for (let attempt = 0; attempt < 20; attempt += 1) {
      if (mocks.uploadRestaurantHeroImage.mock.calls.length > 0) break
      await flushTurn()
    }
    expect(mocks.uploadRestaurantHeroImage).toHaveBeenCalledTimes(1)

    const container = editorContainer!
    expect(
      container.querySelector('[aria-busy="true"]'),
      "editor exposes aria-busy while uploading",
    ).not.toBeNull()
    expect(buttonByLabel(en.staff.branding.saveHero).disabled).toBe(true)
    expect(buttonByLabel(en.staff.branding.chooseDifferentHero).disabled).toBe(
      true,
    )
    expect(fileInput().disabled).toBe(true)

    await act(async () => {
      buttonByLabel(en.staff.branding.saveHero).click()
    })
    expect(mocks.uploadRestaurantHeroImage).toHaveBeenCalledTimes(1)

    await act(async () => {
      resolveUpload({ heroImageUrl: "https://example.test/new.jpg" })
    })
    for (let attempt = 0; attempt < 20; attempt += 1) {
      if (mocks.mutate.mock.calls.length > 0) break
      await flushTurn()
    }
    await flushTurn()

    expect(container.querySelector('[aria-busy="true"]')).toBeNull()
    expect(mocks.mutate).toHaveBeenCalled()
  })
})
