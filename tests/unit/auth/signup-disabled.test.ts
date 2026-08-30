import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const configPath = path.join(process.cwd(), "supabase", "config.toml")

function tableBody(toml: string, tableName: string): string {
  const header = `[${tableName}]`
  const lines = toml.split(/\r?\n/)
  const body: string[] = []
  let inTable = false
  for (const raw of lines) {
    const line = raw.trim()
    if (line.startsWith("#")) continue
    if (line.startsWith("[") && line.endsWith("]")) {
      inTable = line === header
      continue
    }
    if (inTable) body.push(line)
  }
  return body.join("\n")
}

function booleanKey(table: string, key: string): boolean | undefined {
  const match = table.match(new RegExp(`^${key}\\s*=\\s*(true|false)\\b`, "m"))
  if (!match) return undefined
  return match[1] === "true"
}

describe("local Auth signup", () => {
  it("local Auth and email signup flags are false", () => {
    const toml = readFileSync(configPath, "utf8")

    expect({
      auth: booleanKey(tableBody(toml, "auth"), "enable_signup"),
      email: booleanKey(tableBody(toml, "auth.email"), "enable_signup"),
    }).toEqual({ auth: false, email: false })
  })
})
