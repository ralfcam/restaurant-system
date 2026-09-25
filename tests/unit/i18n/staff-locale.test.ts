import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it, vi } from "vitest"

vi.mock("next-intl/server", () => ({
  getRequestConfig: <T>(createRequestConfig: T) => createRequestConfig,
}))

import requestConfig from "@/i18n/request"

const STAFF_LAYOUTS = [
  "app/admin/layout.tsx",
  "app/pos/layout.tsx",
  "app/kds/layout.tsx",
  "app/auth/layout.tsx",
] as const

function layoutMountsFrenchProvider(rel: string): boolean {
  const filePath = path.join(process.cwd(), rel)
  if (!existsSync(filePath)) return false
  return /<NextIntlClientProvider\b/.test(readFileSync(filePath, "utf8"))
}

function hasStaffNamespace(messages: unknown): boolean {
  if (
    messages === null ||
    typeof messages !== "object" ||
    Array.isArray(messages)
  ) {
    return false
  }
  const staff = (messages as Record<string, unknown>).staff
  return staff !== null && typeof staff === "object" && !Array.isArray(staff)
}

describe("staff French locale", () => {
  it("staff routes render the fr catalog", async () => {
    const providers = Object.fromEntries(
      STAFF_LAYOUTS.map((rel) => [rel, layoutMountsFrenchProvider(rel)]),
    )

    const config = await requestConfig({
      requestLocale: Promise.resolve(undefined),
    })

    expect({
      providers,
      locale: config.locale,
      staffNamespace: hasStaffNamespace(config.messages),
    }).toEqual({
      providers: {
        "app/admin/layout.tsx": true,
        "app/pos/layout.tsx": true,
        "app/kds/layout.tsx": true,
        "app/auth/layout.tsx": true,
      },
      locale: "fr",
      staffNamespace: true,
    })
  })
})
