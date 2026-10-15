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
import { MAX_HERO_BYTES } from "@/lib/branding"

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

const HERO_PREVIEW_ALT = en.staff.branding.heroPreviewAlt
const HERO_BACKGROUND_ALT = en.staff.branding.heroBackgroundAlt
const HERO_TOO_LARGE = en.errors.branding.heroTooLarge

let mountedRoot: Root | undefined

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

function fileOfSize(name: string, size: number): File {
  const file = new File([new Uint8Array(0)], name, { type: "image/png" })
  Object.defineProperty(file, "size", { value: size })
  return file
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

function saveButton(): HTMLButtonElement {
  const button = [...document.querySelectorAll("button")].find((element) =>
    element.textContent?.includes(en.staff.branding.saveHero),
  )
  expect(button, "Save hero image").toBeInstanceOf(HTMLButtonElement)
  return button as HTMLButtonElement
}

function liveError(): HTMLElement | null {
  return document.querySelector('[aria-live="polite"], [role="alert"]')
}

function renderEditor() {
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
        createElement(RestaurantHeroImageEditor, { isSuperAdmin: true }),
      ),
    )
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
    document.body.replaceChildren()
  })

  it("hero editor rejects a just-over-5MB file inline and keeps the current hero", async () => {
    stubObjectUrls()
    renderEditor()

    expect(
      document.querySelector(`img[alt="${HERO_BACKGROUND_ALT}"]`),
    ).not.toBeNull()

    const overLimit = fileOfSize("too-big.png", MAX_HERO_BYTES + 1)
    expect(overLimit.size).toBe(MAX_HERO_BYTES + 1)

    const input = fileInput()
    await act(async () => {
      selectFile(input, overLimit)
    })

    const error = liveError()
    expect(error?.textContent ?? "").toContain("5 MB")
    expect(error?.textContent ?? "").toContain(HERO_TOO_LARGE)
    expect(input.getAttribute("aria-invalid")).toBe("true")
    expect(input.getAttribute("aria-describedby")).toBe(error?.id)
    expect(error?.id).toBeTruthy()

    const save = saveButton()
    expect(save.disabled).toBe(true)
    await act(async () => {
      save.click()
    })
    expect(mocks.uploadRestaurantHeroImage).not.toHaveBeenCalled()

    expect(document.querySelector(`img[alt="${HERO_PREVIEW_ALT}"]`)).toBeNull()
    expect(
      document.querySelector(`img[alt="${HERO_BACKGROUND_ALT}"]`),
    ).not.toBeNull()

    const valid = fileOfSize("ok.png", 1024)
    await act(async () => {
      selectFile(input, valid)
    })

    const announced = [
      ...document.querySelectorAll('[aria-live="polite"], [role="alert"]'),
    ].map((element) => element.textContent?.trim() ?? "")
    expect(announced.filter(Boolean)).toEqual([])
    expect(input.getAttribute("aria-invalid")).not.toBe("true")
    expect(
      document.querySelector(`img[alt="${HERO_PREVIEW_ALT}"]`),
    ).not.toBeNull()
  })
})
