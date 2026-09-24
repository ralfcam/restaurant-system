import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const reservationWidgetPath = path.join(
  process.cwd(),
  "components",
  "site",
  "reservation-widget.tsx",
)

const FULLY_BOOKED_KEY = "errors.reservation.fullyBooked"

/** Messages that today match the slot-unavailable toast (blocked / hours / closed). */
const SLOT_ERROR_KEYS = [
  "errors.reservation.bookingDateBlocked",
  "errors.reservation.bookingClosed",
  "errors.reservation.bookingOutsideHours",
  "errors.reservation.closed",
  "errors.reservation.outsideHours",
] as const

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function readReservationWidgetSource() {
  return readFileSync(reservationWidgetPath, "utf8")
}

function extractBalanced(source: string, openIdx: number): string {
  if (source[openIdx] !== "{") return ""
  let depth = 0
  for (let i = openIdx; i < source.length; i += 1) {
    const ch = source[i]
    if (ch === "{") depth += 1
    else if (ch === "}") {
      depth -= 1
      if (depth === 0) return source.slice(openIdx, i + 1)
    }
  }
  return ""
}

function extractConfirm(source: string): string {
  const match = source.match(/async function confirm\s*\(/)
  if (!match || match.index === undefined) return ""
  const openIdx = source.indexOf("{", match.index)
  return extractBalanced(source, openIdx)
}

function extractIfBody(
  src: string,
  ifHead: RegExp,
): {
  body: string
  end: number
} | null {
  const match = ifHead.exec(src)
  if (!match || match.index === undefined) return null
  const openIdx = src.indexOf("{", match.index + match[0].length - 1)
  if (openIdx < 0) return null
  const body = extractBalanced(src, openIdx)
  if (!body) return null
  return { body, end: openIdx + body.length }
}

function extractElseAfter(src: string, ifHead: RegExp): string {
  const then = extractIfBody(src, ifHead)
  if (!then) return ""
  const after = src.slice(then.end)
  const elseMatch = after.match(/^\s*else\s*\{/)
  if (!elseMatch) return ""
  const elseOpen = then.end + elseMatch[0].length - 1
  return extractBalanced(src, elseOpen)
}

/** Branch that handles the BW-12 / BW-15 fully booked P0001 string. */
function isolateFullyBookedHandling(confirmSrc: string): string {
  const errorIf = extractIfBody(confirmSrc, /if\s*\(\s*error\s*\)/)
  const errorBlock = errorIf?.body ?? confirmSrc

  const keyPattern = escapeRegExp(FULLY_BOOKED_KEY)
  const dedicatedIf = extractIfBody(
    errorBlock,
    new RegExp(
      `if\\s*\\((?:[^()]*|\\([^()]*\\))*${keyPattern}(?:[^()]*|\\([^()]*\\))*\\)`,
    ),
  )
  if (dedicatedIf) return dedicatedIf.body

  const flag = errorBlock.match(
    new RegExp(`(?:const|let)\\s+(\\w+)\\s*=\\s*[\\s\\S]{0,240}${keyPattern}`),
  )
  if (flag) {
    const flagIf = extractIfBody(
      errorBlock,
      new RegExp(`if\\s*\\(\\s*${flag[1]}\\s*\\)`),
    )
    if (flagIf) return flagIf.body
  }

  // Today's fall-through: fully booked is not an isSlotError, so it hits else.
  return extractElseAfter(errorBlock, /if\s*\(\s*isSlotError\s*\)/)
}

function extractStep2Panel(source: string): string {
  const start = source.search(/\{\s*step\s*===\s*2\b/)
  if (start < 0) return ""
  return extractBalanced(source, start)
}

function step2RendersFullyBookedRejection(
  step2: string,
  fullyBookedBranch: string,
): boolean {
  if (step2.includes(FULLY_BOOKED_KEY)) return true

  // Identifier-only mentions (`fullyBooked` / `fullyBookedError` in a
  // condition or setter) are not guest-visible rejection copy — sibling
  // staff-list-guest-email strips ficha/href mentions before asserting.
  const visibleSource = step2
    .replace(/\bsetFullyBookedError\b/g, "")
    .replace(/\bfullyBookedError\b/g, "")
    .replace(/\bfullyBooked\b/g, "")
  const visibleCopy =
    /fully\s*booked|no remaining availability|no availability remains/i
  if (visibleCopy.test(visibleSource)) return true

  const setters = [...fullyBookedBranch.matchAll(/set([A-Z]\w*)\s*\(/g)]
  return setters.some((m) => {
    const state = m[1][0]!.toLowerCase() + m[1].slice(1)
    return new RegExp(`\\{\\s*${state}\\s*\\}`).test(step2)
  })
}

function extractOnClickExpressions(jsx: string): string[] {
  const expressions: string[] = []
  const re = /onClick\s*=\s*\{/g
  let match: RegExpExecArray | null
  while ((match = re.exec(jsx))) {
    const expr = extractBalanced(jsx, match.index + match[0].length - 1)
    if (expr) expressions.push(expr)
  }
  return expressions
}

function resolveClickHandler(source: string, onClickExpr: string): string {
  // Numbered group — tsconfig target is ES6; named groups are TS1503.
  const named = /^\{([A-Za-z_$][\w$]*)\}$/.exec(onClickExpr.trim())
  if (!named?.[1]) return onClickExpr
  const name = named[1]
  const fnHead = new RegExp(
    `(?:function\\s+${name}\\s*\\([^)]*\\)\\s*|const\\s+${name}\\s*=\\s*(?:\\([^)]*\\)|[A-Za-z_$][\\w$]*)\\s*=>\\s*)\\{`,
  ).exec(source)
  if (!fnHead || fnHead.index === undefined) return onClickExpr
  const openIdx = source.indexOf("{", fnHead.index + fnHead[0].length - 1)
  return extractBalanced(source, openIdx) || onClickExpr
}

function extractStep2LeaveHandlers(source: string, step2: string): string[] {
  return extractOnClickExpressions(step2)
    .map((expr) => resolveClickHandler(source, expr))
    .filter((body) => /setStep\s*\(\s*1\s*\)/.test(body))
}

function extractDenialSetters(fullyBookedBranch: string): string[] {
  return [...fullyBookedBranch.matchAll(/\b(set[A-Z]\w*)\s*\(/g)].map(
    (m) => m[1]!,
  )
}

function denialClearPattern(setter: string): RegExp {
  return new RegExp(
    `\\b${setter}\\s*\\(\\s*(?:null|undefined|["'\`]{2})\\s*\\)`,
  )
}

describe("reservation widget fully booked confirmation error", () => {
  it("fully booked rejection is shown inside the confirmation form without a page toast", () => {
    const source = readReservationWidgetSource()
    const confirmSrc = extractConfirm(source)
    expect(confirmSrc.length).toBeGreaterThan(0)

    expect(confirmSrc).toContain(FULLY_BOOKED_KEY)

    const fullyBookedBranch = isolateFullyBookedHandling(confirmSrc)
    expect(fullyBookedBranch.length).toBeGreaterThan(0)

    // BW-16: this rejection is not a page-level toaster.
    expect(fullyBookedBranch).not.toMatch(/toast\.error/)
    expect(fullyBookedBranch).not.toMatch(/\btoast\s*\./)

    // Stay on the confirmation form (step 2).
    expect(fullyBookedBranch).not.toMatch(/setStep\s*\(\s*1\s*\)/)
    expect(fullyBookedBranch).not.toMatch(/setStep\s*\(\s*3\s*\)/)

    // Guest details already entered must remain.
    expect(fullyBookedBranch).not.toMatch(/\breset\s*\(/)
    expect(fullyBookedBranch).not.toMatch(/setName\s*\(\s*["'`]{2}\s*\)/)
    expect(fullyBookedBranch).not.toMatch(/setEmail\s*\(\s*["'`]{2}\s*\)/)
    expect(fullyBookedBranch).not.toMatch(/setPhone\s*\(\s*["'`]{2}\s*\)/)

    const step2 = extractStep2Panel(source)
    expect(step2.length).toBeGreaterThan(0)
    expect(step2).toMatch(/<form\b[\s\S]*\bonSubmit=\{confirm\}/)
    expect(step2RendersFullyBookedRejection(step2, fullyBookedBranch)).toBe(
      true,
    )
  })

  it("fully booked rejection is cleared when the guest leaves the confirmation form", () => {
    const source = readReservationWidgetSource()
    const confirmSrc = extractConfirm(source)
    expect(confirmSrc.length).toBeGreaterThan(0)

    expect(confirmSrc).toContain(FULLY_BOOKED_KEY)

    const fullyBookedBranch = isolateFullyBookedHandling(confirmSrc)
    expect(fullyBookedBranch.length).toBeGreaterThan(0)

    const denialSetters = extractDenialSetters(fullyBookedBranch)
    expect(denialSetters.length).toBeGreaterThan(0)

    const step2 = extractStep2Panel(source)
    expect(step2.length).toBeGreaterThan(0)

    const leaveHandlers = extractStep2LeaveHandlers(source, step2)
    expect(leaveHandlers.length).toBeGreaterThan(0)

    for (const handler of leaveHandlers) {
      for (const setter of denialSetters) {
        expect(handler).toMatch(denialClearPattern(setter))
      }
    }
  })

  it("slot-unavailable toast branches on reservation error keys", () => {
    const source = readReservationWidgetSource()
    const confirmSrc = extractConfirm(source)
    expect(confirmSrc.length).toBeGreaterThan(0)

    for (const key of SLOT_ERROR_KEYS) {
      expect(confirmSrc).toContain(key)
    }

    const slotBranch = extractIfBody(confirmSrc, /if\s*\(\s*isSlotError\s*\)/)
    expect(slotBranch?.body.length ?? 0).toBeGreaterThan(0)
    expect(slotBranch!.body).toMatch(/setSlot\s*\(\s*null\s*\)/)
    expect(slotBranch!.body).toMatch(/setStep\s*\(\s*1\s*\)/)
    expect(slotBranch!.body).toMatch(/toast\.error/)
    expect(slotBranch!.body).not.toMatch(/setStep\s*\(\s*3\s*\)/)
    expect(slotBranch!.body).not.toMatch(/\breset\s*\(/)
    expect(slotBranch!.body).not.toMatch(/setName\s*\(\s*["'`]{2}\s*\)/)
    expect(slotBranch!.body).not.toMatch(/setEmail\s*\(\s*["'`]{2}\s*\)/)
    expect(slotBranch!.body).not.toMatch(/setPhone\s*\(\s*["'`]{2}\s*\)/)
  })
})
