import { expect } from "vitest"
import en from "@/messages/en.json"
import fr from "@/messages/fr.json"

function resolveLeaf(catalog: unknown, key: string): unknown {
  let node: unknown = catalog
  for (const part of key.split(".")) {
    if (node === null || typeof node !== "object" || Array.isArray(node)) {
      return undefined
    }
    node = (node as Record<string, unknown>)[part]
  }
  return node
}

/** `key` is a dot path that resolves to a non-empty string in fr and en. */
export function expectCatalogKey(key: string): void {
  const frValue = resolveLeaf(fr, key)
  const enValue = resolveLeaf(en, key)
  expect(typeof frValue, `fr ${key}`).toBe("string")
  expect(typeof enValue, `en ${key}`).toBe("string")
  expect((frValue as string).trim().length, `fr ${key}`).toBeGreaterThan(0)
  expect((enValue as string).trim().length, `en ${key}`).toBeGreaterThan(0)
}
