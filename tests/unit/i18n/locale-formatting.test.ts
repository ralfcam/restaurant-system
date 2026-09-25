import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const SCAN_ROOTS = [
  "app/admin",
  "app/auth",
  "app/pos",
  "app/kds",
  "app/[locale]",
  "components/staff",
  "components/site",
] as const

const EXTRA_FILES = ["app/actions/operations.ts"] as const

const CALENDAR_FILE = "components/site/reservation-calendar.tsx"

const LOCALE_METHOD = /\.toLocale(?:Date|Time)?String\b/g

const ENGLISH_WEEKDAYS =
  /["']Sun["']\s*,\s*["']Mon["']\s*,\s*["']Tue["']\s*,\s*["']Wed["']\s*,\s*["']Thu["']\s*,\s*["']Fri["']\s*,\s*["']Sat["']/

function readSource(rel: string): string {
  return readFileSync(path.join(process.cwd(), rel), "utf8")
}

function walkTsFiles(relDir: string): string[] {
  const abs = path.join(process.cwd(), relDir)
  if (!existsSync(abs)) return []
  const files: string[] = []
  for (const entry of readdirSync(abs)) {
    const rel = `${relDir}/${entry}`.replaceAll("\\", "/")
    const absEntry = path.join(abs, entry)
    if (statSync(absEntry).isDirectory()) {
      files.push(...walkTsFiles(rel))
      continue
    }
    if (entry.endsWith(".ts") || entry.endsWith(".tsx")) files.push(rel)
  }
  return files
}

function skipString(source: string, start: number): number {
  const quote = source[start]
  let i = start + 1
  while (i < source.length) {
    if (source[i] === "\\") {
      i += 2
      continue
    }
    if (source[i] === quote || source[i] === "\n")
      return i + (source[i] === quote ? 1 : 0)
    i++
  }
  return i
}

function skipTemplate(source: string, start: number): number {
  let i = start + 1
  while (i < source.length) {
    if (source[i] === "\\") {
      i += 2
      continue
    }
    if (source[i] === "`") return i + 1
    if (source[i] === "$" && source[i + 1] === "{") {
      i += 2
      let depth = 1
      while (i < source.length && depth > 0) {
        if (source[i] === "'" || source[i] === '"') {
          i = skipString(source, i)
          continue
        }
        if (source[i] === "`") {
          i = skipTemplate(source, i)
          continue
        }
        if (source[i] === "{") depth++
        else if (source[i] === "}") depth--
        if (depth > 0) i++
        else i++
      }
      continue
    }
    i++
  }
  return i
}

function stripComments(source: string): string {
  let out = ""
  let i = 0
  while (i < source.length) {
    const c = source[i]
    const next = source[i + 1]
    if (c === "/" && next === "/") {
      out += "  "
      i += 2
      while (i < source.length && source[i] !== "\n") {
        out += " "
        i++
      }
      continue
    }
    if (c === "/" && next === "*") {
      out += "  "
      i += 2
      while (
        i < source.length &&
        !(source[i] === "*" && source[i + 1] === "/")
      ) {
        out += source[i] === "\n" ? "\n" : " "
        i++
      }
      if (i < source.length) {
        out += "  "
        i += 2
      }
      continue
    }
    if (c === '"' || c === "'") {
      const end = skipString(source, i)
      out += source.slice(i, end)
      i = end
      continue
    }
    if (c === "`") {
      const end = skipTemplate(source, i)
      out += source.slice(i, end)
      i = end
      continue
    }
    out += c
    i++
  }
  return out
}

function lineOf(source: string, index: number): number {
  let line = 1
  for (let i = 0; i < index; i++) if (source[i] === "\n") line++
  return line
}

function readBalanced(
  source: string,
  openIndex: number,
  open: string,
  close: string,
): string {
  let depth = 0
  let i = openIndex
  while (i < source.length) {
    const c = source[i]
    if (c === "'" || c === '"') {
      i = skipString(source, i)
      continue
    }
    if (c === "`") {
      i = skipTemplate(source, i)
      continue
    }
    if (c === open) depth++
    else if (c === close) {
      depth--
      if (depth === 0) return source.slice(openIndex + 1, i)
    }
    i++
  }
  return source.slice(openIndex + 1)
}

function splitTopLevel(args: string): string[] {
  const parts: string[] = []
  let current = ""
  let paren = 0
  let brace = 0
  let bracket = 0
  let i = 0
  while (i < args.length) {
    const c = args[i]
    if (c === "'" || c === '"') {
      const end = skipString(args, i)
      current += args.slice(i, end)
      i = end
      continue
    }
    if (c === "`") {
      const end = skipTemplate(args, i)
      current += args.slice(i, end)
      i = end
      continue
    }
    if (c === "(") paren++
    else if (c === ")") paren--
    else if (c === "{") brace++
    else if (c === "}") brace--
    else if (c === "[") bracket++
    else if (c === "]") bracket--
    else if (c === "," && paren === 0 && brace === 0 && bracket === 0) {
      parts.push(current.trim())
      current = ""
      i++
      continue
    }
    current += c
    i++
  }
  if (current.trim() !== "" || parts.length > 0) parts.push(current.trim())
  return parts.filter((part, index) => part !== "" || index < parts.length - 1)
}

function isOffendingLocale(arg: string | undefined): boolean {
  if (arg === undefined) return true
  const trimmed = arg.trim()
  if (trimmed === "" || trimmed === "undefined") return true
  if (trimmed.replace(/\s/g, "") === "[]") return true
  if (trimmed === '"default"' || trimmed === "'default'") return true
  if (trimmed.startsWith("{")) return true
  return false
}

type LocaleCall = {
  localeArg: string | undefined
  options: string
  index: number
}

function localeCalls(source: string): LocaleCall[] {
  const calls: LocaleCall[] = []
  LOCALE_METHOD.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = LOCALE_METHOD.exec(source))) {
    let i = match.index + match[0].length
    while (i < source.length && /\s/.test(source[i])) i++
    if (source[i] !== "(") continue
    const inner = readBalanced(source, i, "(", ")")
    const args = splitTopLevel(inner).filter((part) => part !== "")
    calls.push({
      localeArg: args[0],
      options: args.slice(1).join(","),
      index: match.index,
    })
  }
  return calls
}

function offendingCalls(): string[] {
  const files = [
    ...SCAN_ROOTS.flatMap((root) => walkTsFiles(root)),
    ...EXTRA_FILES,
  ]
  const hits: string[] = []
  for (const rel of files) {
    const raw = readSource(rel)
    const source = stripComments(raw)
    for (const call of localeCalls(source)) {
      if (!isOffendingLocale(call.localeArg)) continue
      hits.push(`${rel}:${lineOf(raw, call.index)}`)
    }
  }
  return hits.sort()
}

function routeLocaleExpression(source: string): string | null {
  const imported = source.match(
    /import\s*\{([^}]+)\}\s*from\s*["']next-intl["']/,
  )
  let hook = "useLocale"
  if (imported) {
    const binding = imported[1]
      .split(",")
      .map((part) => part.trim())
      .find((part) => part === "useLocale" || part.startsWith("useLocale "))
    if (!binding) return localeProp(source)
    const alias = binding.match(/^useLocale\s+as\s+([A-Za-z_$][\w$]*)$/)
    hook = alias?.[1] ?? "useLocale"
  } else if (!source.includes("useLocale")) {
    return localeProp(source)
  }

  const assigned = source.match(
    new RegExp(`(?:const|let)\\s+([A-Za-z_$][\\w$]*)\\s*=\\s*${hook}\\s*\\(`),
  )
  if (assigned) return assigned[1]
  if (new RegExp(`${hook}\\s*\\(`).test(source)) return `${hook}()`
  return localeProp(source)
}

function localeProp(source: string): string | null {
  const signature = source.match(
    /function\s+ReservationCalendar\s*\(\s*\{([\s\S]*?)\}\s*:/,
  )
  if (signature && /\blocale\b/.test(signature[1])) return "locale"
  return null
}

function argUsesLocale(arg: string | undefined, localeExpr: string): boolean {
  if (arg === undefined || isOffendingLocale(arg)) return false
  const normalized = arg.trim().replace(/\s+/g, " ")
  const expected = localeExpr.trim().replace(/\s+/g, " ")
  if (normalized === expected) return true
  if (/^[A-Za-z_$][\w$]*$/.test(expected)) {
    return new RegExp(`\\b${expected}\\b`).test(normalized)
  }
  return normalized.includes(expected)
}

function intlUsesLocale(
  source: string,
  localeExpr: string,
  option: "weekday" | "month",
): boolean {
  const re = /Intl\.DateTimeFormat\s*\(/g
  let match: RegExpExecArray | null
  while ((match = re.exec(source))) {
    const inner = readBalanced(
      source,
      match.index + match[0].length - 1,
      "(",
      ")",
    )
    const args = splitTopLevel(inner).filter((part) => part !== "")
    if (
      argUsesLocale(args[0], localeExpr) &&
      new RegExp(`\\b${option}\\s*:`).test(args.slice(1).join(","))
    ) {
      return true
    }
  }
  return false
}

function calendarProblems(source: string): string[] {
  const stripped = stripComments(source)
  const problems: string[] = []
  if (ENGLISH_WEEKDAYS.test(stripped)) {
    problems.push("weekday headers are a hard-coded English array")
  }

  const localeExpr = routeLocaleExpression(stripped)
  if (!localeExpr) {
    problems.push("calendar does not read the route locale")
    return problems
  }

  const calls = localeCalls(stripped)
  const monthCalls = calls.filter((call) => /\bmonth\s*:/.test(call.options))
  if (
    monthCalls.length === 0 ||
    monthCalls.some((call) => !argUsesLocale(call.localeArg, localeExpr))
  ) {
    problems.push("month label is not produced from the route locale")
  }

  const weekdayFromLocale =
    calls.some(
      (call) =>
        /\bweekday\s*:/.test(call.options) &&
        argUsesLocale(call.localeArg, localeExpr),
    ) || intlUsesLocale(stripped, localeExpr, "weekday")
  if (!weekdayFromLocale) {
    problems.push("weekday labels are not produced from the route locale")
  }

  return problems
}

describe("explicit locale formatting", () => {
  it("staff and guest date formatting use an explicit locale", () => {
    expect({
      offending: offendingCalls(),
      calendar: calendarProblems(readSource(CALENDAR_FILE)),
    }).toEqual({
      offending: [],
      calendar: [],
    })
  })
})
