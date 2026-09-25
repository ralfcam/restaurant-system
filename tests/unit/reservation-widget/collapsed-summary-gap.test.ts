import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const reservationWidgetPath = path.join(
  process.cwd(),
  "components",
  "site",
  "reservation-widget.tsx",
)

function readReservationWidgetSource() {
  return readFileSync(reservationWidgetPath, "utf8")
}

const ACCORDION_CHROME = [
  { value: "guests", labelKey: "guests", summaryKey: "guestsSummary" },
  { value: "date", labelKey: "date", summaryKey: "dateSummary" },
  { value: "time", labelKey: "time", summaryKey: "timeSummary" },
] as const

/** Unprefixed non-zero Tailwind gap or leading margin. `gap-0` / `sm:gap-*` do not match. */
const LABEL_SUMMARY_SEPARATOR_RE =
  /^(?:gap|gap-x|ml|ms)-(?:px|0\.[1-9]\d*|[1-9]\d*(?:\.\d+)?|\[[^\]]+\])$/

const VIEWPORT_PREFIX_RE =
  /^(?:sm|md|lg|xl|2xl|max-sm|max-md|max-lg|max-xl|max-2xl):/

function extractBalanced(source: string, openIdx: number): string {
  const open = source[openIdx]
  const close = open === "{" ? "}" : open === "(" ? ")" : ""
  if (!close) return ""
  let depth = 0
  let quote: string | null = null
  for (let i = openIdx; i < source.length; i += 1) {
    const ch = source[i]
    const prev = i > 0 ? source[i - 1] : ""
    if (quote) {
      if (ch === quote && prev !== "\\") quote = null
      continue
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      quote = ch
      continue
    }
    if (ch === open) depth += 1
    else if (ch === close) {
      depth -= 1
      if (depth === 0) return source.slice(openIdx, i + 1)
    }
  }
  return ""
}

function stringLiterals(src: string): string[] {
  return [...src.matchAll(/["']([^"']*)["']/g)].map((m) => m[1]!)
}

function namedCnLiterals(source: string, name: string): string {
  const assignedString = new RegExp(
    `const\\s+${name}\\s*=\\s*["']([^"']*)["']`,
  ).exec(source)
  if (assignedString?.[1]) return assignedString[1]

  const head = new RegExp(`const\\s+${name}\\s*=\\s*cn\\s*\\(`).exec(source)
  if (!head || head.index === undefined) return ""
  const openIdx = source.indexOf("(", head.index + head[0].length - 1)
  return stringLiterals(extractBalanced(source, openIdx)).join(" ")
}

function extractAccordionTrigger(source: string, itemValue: string): string {
  const itemOpen = source.search(
    new RegExp(`<AccordionItem\\b[^>]*\\bvalue=["']${itemValue}["']`),
  )
  if (itemOpen < 0) return ""
  const triggerOpen = source.indexOf("<AccordionTrigger", itemOpen)
  if (triggerOpen < 0) return ""
  const close = "</AccordionTrigger>"
  const triggerClose = source.indexOf(close, triggerOpen)
  if (triggerClose < 0) return ""
  return source.slice(triggerOpen, triggerClose + close.length)
}

function extractOpenTag(jsx: string, tagName: string): string {
  const start = jsx.search(new RegExp(`<${tagName}\\b`))
  if (start < 0) return ""
  const end = jsx.indexOf(">", start)
  if (end < 0) return ""
  return jsx.slice(start, end + 1)
}

function resolveClassName(source: string, openTag: string): string {
  const quoted = /className=["']([^"']+)["']/.exec(openTag)
  if (quoted?.[1]) return quoted[1]

  const exprAt = openTag.search(/className=\{/)
  if (exprAt < 0) return ""
  const braceAt = openTag.indexOf("{", exprAt)
  const expr = extractBalanced(openTag, braceAt)
  if (!expr) return ""
  const inner = expr.slice(1, -1).trim()

  if (inner === "accordionTriggerCls") {
    return namedCnLiterals(source, "accordionTriggerCls")
  }

  if (/^cn\s*\(/.test(inner)) {
    const parts: string[] = []
    if (/\baccordionTriggerCls\b/.test(inner)) {
      parts.push(namedCnLiterals(source, "accordionTriggerCls"))
    }
    parts.push(...stringLiterals(inner))
    return parts.filter(Boolean).join(" ")
  }

  return ""
}

function extractCallSpan(trigger: string, key: string): string {
  const call = trigger.search(new RegExp(`t\\(\\s*["']${key}["']`))
  if (call < 0) return ""
  const spanStart = trigger.lastIndexOf("<span", call)
  if (spanStart < 0) return ""
  const spanClose = trigger.indexOf("</span>", call)
  if (spanClose < 0) return ""
  return trigger.slice(spanStart, spanClose + "</span>".length)
}

function classTokens(...classNames: string[]): string[] {
  return classNames.join(" ").split(/\s+/).filter(Boolean)
}

function labelSummarySeparators(
  triggerClasses: string,
  summaryClasses: string,
): string[] {
  // Label-span `gap-1.5` (icon-to-label) is intentionally omitted — BW-17
  // requires a gap between the chrome label node and the collapsed summary.
  return classTokens(triggerClasses, summaryClasses).filter(
    (token) =>
      !VIEWPORT_PREFIX_RE.test(token) && LABEL_SUMMARY_SEPARATOR_RE.test(token),
  )
}

function separatorsForItem(
  source: string,
  item: (typeof ACCORDION_CHROME)[number],
): string[] {
  const trigger = extractAccordionTrigger(source, item.value)
  expect(trigger.length).toBeGreaterThan(0)
  expect(trigger).toMatch(new RegExp(`t\\(\\s*["']${item.labelKey}["']`))
  expect(trigger).toMatch(new RegExp(`t\\(\\s*["']${item.summaryKey}["']`))

  const triggerClasses = resolveClassName(
    source,
    extractOpenTag(trigger, "AccordionTrigger"),
  )
  const summaryClasses = resolveClassName(
    source,
    extractOpenTag(extractCallSpan(trigger, item.summaryKey), "span"),
  )
  return labelSummarySeparators(triggerClasses, summaryClasses)
}

describe("reservation widget collapsed summary gap", () => {
  it("collapsed guests and date summaries are separated from their accordion labels", () => {
    const source = readReservationWidgetSource()

    const perItem = ACCORDION_CHROME.map((item) =>
      separatorsForItem(source, item),
    )
    const shared = perItem.reduce((acc, list) =>
      acc.filter((token) => list.includes(token)),
    )

    expect(shared[0] ?? "").toMatch(LABEL_SUMMARY_SEPARATOR_RE)

    expect(source).toMatch(/<Select\b/)
    expect(source).toMatch(/<SelectItem\b/)
    expect(source).toMatch(/<Dialog\b/)
    expect(source).toMatch(/<DialogContent\b/)
  })
})
