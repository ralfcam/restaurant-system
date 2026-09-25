import en from "@/messages/en.json"
import fr from "@/messages/fr.json"

export type CopyHit = {
  text: string
  line: number
  kind: "jsx-text" | "attribute" | "label-map" | "toast"
}

const COPY_ATTRS = new Set([
  "title",
  "placeholder",
  "aria-label",
  "alt",
  "label",
  "description",
  "hint",
])

const LABEL_MAP_PROPS = new Set([...COPY_ATTRS, "role"])

const TOAST_METHODS = new Set([
  "success",
  "error",
  "message",
  "info",
  "warning",
  "loading",
  "promise",
  "custom",
])

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

function lineOf(source: string, index: number): number {
  let line = 1
  for (let i = 0; i < index && i < source.length; i++) {
    if (source[i] === "\n") line++
  }
  return line
}

function isIdentChar(char: string): boolean {
  return /[A-Za-z0-9_$]/.test(char)
}

function hasLetter(text: string): boolean {
  return /\p{L}/u.test(text)
}

function normalizeCopy(text: string): string {
  return text.replace(/\s+/g, " ").trim()
}

function isAllowlisted(text: string, allowlist: readonly string[]): boolean {
  return allowlist.includes(text)
}

function skipLineComment(source: string, index: number): number {
  let i = index
  while (i < source.length && source[i] !== "\n") i++
  return i
}

function skipBlockComment(source: string, index: number): number {
  let i = index
  while (i < source.length && !(source[i] === "*" && source[i + 1] === "/")) i++
  return Math.min(source.length, i + 2)
}

function readString(
  source: string,
  index: number,
): { end: number; value: string } | null {
  const quote = source[index]
  if (quote !== "'" && quote !== '"') return null
  let value = ""
  let i = index + 1
  while (i < source.length) {
    const char = source[i]
    if (char === "\\") {
      value += source[i + 1] ?? ""
      i += 2
      continue
    }
    if (char === quote) return { end: i + 1, value }
    if (char === "\n") return null
    value += char
    i++
  }
  return null
}

type TemplateSegment = { at: number; value: string }

/** Walk a template through every interpolation and return each static segment. */
function readTemplateStatic(
  source: string,
  index: number,
): { end: number; segments: TemplateSegment[] } | null {
  if (source[index] !== "`") return null
  const segments: TemplateSegment[] = []
  let value = ""
  let at = index + 1
  let i = index + 1
  while (i < source.length) {
    const char = source[i]
    if (char === "\\") {
      value += source[i + 1] ?? ""
      i += 2
      continue
    }
    if (char === "`") {
      segments.push({ at, value })
      return { end: i + 1, segments }
    }
    if (char === "$" && source[i + 1] === "{") {
      segments.push({ at, value })
      const after = skipTemplateInterpolation(source, i + 2)
      if (after === null) return null
      i = after
      at = i
      value = ""
      continue
    }
    value += char
    i++
  }
  return null
}

function skipTemplateInterpolation(
  source: string,
  index: number,
): number | null {
  let depth = 1
  let i = index
  while (i < source.length && depth > 0) {
    const char = source[i]
    const next = source[i + 1]
    if (char === "/" && next === "/") {
      i = skipLineComment(source, i + 2)
      continue
    }
    if (char === "/" && next === "*") {
      i = skipBlockComment(source, i + 2)
      continue
    }
    if (char === "'" || char === '"') {
      const parsed = readString(source, i)
      if (!parsed) return null
      i = parsed.end
      continue
    }
    if (char === "`") {
      const parsed = readTemplateStatic(source, i)
      if (!parsed) return null
      i = parsed.end
      continue
    }
    if (char === "{") {
      depth++
      i++
      continue
    }
    if (char === "}") {
      depth--
      i++
      continue
    }
    i++
  }
  return depth === 0 ? i : null
}

function pushTemplateSegments(
  hits: CopyHit[],
  source: string,
  segments: readonly TemplateSegment[],
  kind: CopyHit["kind"],
  allowlist: readonly string[],
) {
  for (const segment of segments) {
    if (!segment.value.trim() || isPathLiteral(segment.value)) continue
    if (isUtilityClassString(segment.value)) continue
    if (
      (kind === "jsx-text" || kind === "toast") &&
      isCatalogKey(segment.value)
    )
      continue
    pushHit(hits, source, segment.at, segment.value, kind, allowlist)
  }
}

type Mode = "code" | "jsx-text" | "jsx-tag"

type Frame = {
  mode: Mode
  /** When scanning `{...}`, string literals are user-visible copy. */
  renderStrings: boolean
  braceDepth: number
  /** `className={...}` / `class={...}` values are utility classes, not copy. */
  skipCopy: boolean
}

/** Language-switcher labels. Not a general two-letter-word exemption. */
const LOCALE_CODE_LABELS = new Set(["EN", "FR"])

const TRANSLATOR_METHODS = new Set(["rich", "markup", "raw", "has"])

const LOCALE_FORMAT_METHODS = new Set([
  "toLocaleString",
  "toLocaleDateString",
  "toLocaleTimeString",
])

function pushHit(
  hits: CopyHit[],
  source: string,
  index: number,
  raw: string,
  kind: CopyHit["kind"],
  allowlist: readonly string[],
) {
  const text = normalizeCopy(raw)
  if (!hasLetter(text) || isAllowlisted(text, allowlist)) return
  if (LOCALE_CODE_LABELS.has(text)) return
  hits.push({ text, line: lineOf(source, index), kind })
}

/**
 * Index just after `(` when `name` at `afterName` is `t(`, `t.rich(`, or the
 * same for markup/raw/has. Otherwise null.
 */
function translatorCallOpen(source: string, afterName: number): number | null {
  let j = afterName
  while (j < source.length && /\s/.test(source[j])) j++
  if (source[j] === ".") {
    j++
    while (j < source.length && /\s/.test(source[j])) j++
    const methodStart = j
    while (j < source.length && isIdentChar(source[j])) j++
    const method = source.slice(methodStart, j)
    if (!TRANSLATOR_METHODS.has(method)) return null
    while (j < source.length && /\s/.test(source[j])) j++
  }
  if (source[j] !== "(") return null
  return j + 1
}

function prevToken(source: string, index: number): string {
  let i = index - 1
  while (i >= 0 && /\s/.test(source[i])) i--
  if (i < 0) return ""
  if (!isIdentChar(source[i])) return source[i]
  const end = i + 1
  while (i >= 0 && isIdentChar(source[i])) i--
  return source.slice(i + 1, end)
}

function startsJsx(source: string, index: number): boolean {
  if (source[index] !== "<") return false
  const next = source[index + 1]
  if (next !== "/" && next !== ">" && !(next && /[A-Za-z]/.test(next)))
    return false
  const prev = prevToken(source, index)
  if (prev !== "" && prev !== "return" && isIdentChar(prev[0] ?? ""))
    return false
  return true
}

function isPathLiteral(value: string): boolean {
  const text = value.trim()
  return (
    text.startsWith("/") || text.startsWith("#") || /^https?:\/\//.test(text)
  )
}

const COMPARISON_OPERATORS = new Set(["===", "!==", "==", "!="])

/** Dotted catalog keys (`status.weekly.available`) are not user-visible copy. */
function isCatalogKey(text: string): boolean {
  return /^[A-Za-z_][\w]*(\.[A-Za-z_][\w]*)+$/.test(normalizeCopy(text))
}

function comparisonOperatorBefore(source: string, index: number): string {
  let i = index - 1
  while (i >= 0 && /\s/.test(source[i])) i--
  if (i < 0 || (source[i] !== "=" && source[i] !== "!")) return ""
  const end = i + 1
  while (i >= 0 && (source[i] === "=" || source[i] === "!")) i--
  return source.slice(i + 1, end)
}

function comparisonOperatorAfter(source: string, index: number): string {
  let i = index
  while (i < source.length && /\s/.test(source[i])) i++
  if (i >= source.length || (source[i] !== "=" && source[i] !== "!")) return ""
  const start = i
  while (i < source.length && (source[i] === "=" || source[i] === "!")) i++
  return source.slice(start, i)
}

/**
 * A string literal is a comparison operand when `===` / `!==` / `==` / `!=`
 * is the nearest non-whitespace token on either side (`status === "available"`).
 */
function isComparisonOperand(
  source: string,
  start: number,
  end: number,
): boolean {
  return (
    COMPARISON_OPERATORS.has(comparisonOperatorBefore(source, start)) ||
    COMPARISON_OPERATORS.has(comparisonOperatorAfter(source, end))
  )
}

/** Comparison operands and dotted catalog keys are not system copy. */
function isNonCopyLiteral(
  source: string,
  start: number,
  end: number,
  raw: string,
): boolean {
  return isCatalogKey(raw) || isComparisonOperand(source, start, end)
}

/**
 * A Tailwind/utility token has a hyphen, variant colon, slash, or bracket
 * (`text-sm`, `hover:bg-accent`, `w-[120px]`). Bare words stay copy.
 */
function isUtilityClassToken(token: string): boolean {
  if (!/^!?-?[a-z0-9_:[\]()/.%,#@&>*+~=-]+$/.test(token)) return false
  return /[-/:[\]]/.test(token)
}

/** Every token is a utility class (`text-center text-sm font-medium tabular-nums`). */
function isUtilityClassString(text: string): boolean {
  const tokens = normalizeCopy(text).split(" ").filter(Boolean)
  return tokens.length > 0 && tokens.every(isUtilityClassToken)
}

function isClassNameProp(name: string | null): boolean {
  return name === "className" || name === "class"
}

/**
 * Hard-coded system copy in `source`. `allowlist` is exact normalized text
 * (language-neutral tokens such as `CHF`).
 */
export function findHardCodedCopy(
  source: string,
  allowlist: readonly string[] = [],
): CopyHit[] {
  const hits: CopyHit[] = []
  const stack: Frame[] = [
    { mode: "code", renderStrings: false, braceDepth: 0, skipCopy: false },
  ]
  const translatorNames = translatorBindings(source)
  let nextTranslator = 0
  const activeTranslators = new Set<string>()
  let i = 0
  let pendingProp: string | null = null
  let toastCall = false
  let cnDepth = 0
  /** Next string is a translator key or a toLocale*String locale tag. */
  let skipFirstArg = false

  const top = () => stack[stack.length - 1]

  while (i < source.length) {
    while (
      nextTranslator < translatorNames.length &&
      translatorNames[nextTranslator].index <= i
    ) {
      activeTranslators.add(translatorNames[nextTranslator].name)
      nextTranslator++
    }

    const frame = top()
    const char = source[i]
    const next = source[i + 1]

    if (char === "/" && next === "/") {
      i = skipLineComment(source, i + 2)
      continue
    }
    if (char === "/" && next === "*") {
      i = skipBlockComment(source, i + 2)
      continue
    }

    if (skipFirstArg) {
      if (/\s/.test(char)) {
        i++
        continue
      }
      if (char === "'" || char === '"') {
        const parsed = readString(source, i)
        skipFirstArg = false
        pendingProp = null
        toastCall = false
        if (!parsed) {
          i++
          continue
        }
        i = parsed.end
        continue
      }
      if (char === "`") {
        const parsed = readTemplateStatic(source, i)
        skipFirstArg = false
        pendingProp = null
        toastCall = false
        if (!parsed) {
          i++
          continue
        }
        i = parsed.end
        continue
      }
      skipFirstArg = false
    }

    if (frame.mode === "jsx-text") {
      if (char === "{") {
        stack.push({
          mode: "code",
          renderStrings: true,
          braceDepth: 1,
          skipCopy: false,
        })
        pendingProp = null
        i++
        continue
      }
      if (char === "<" && next === "/") {
        i += 2
        while (i < source.length && source[i] !== ">") i++
        i = Math.min(source.length, i + 1)
        stack.pop()
        continue
      }
      // Text may precede a tag (`plan <ArrowRight`). startsJsx rejects that
      // because the previous token is an identifier; still open the tag.
      if (
        char === "<" &&
        (next === ">" || (next !== undefined && /[A-Za-z]/.test(next)))
      ) {
        stack.push({
          mode: "jsx-tag",
          renderStrings: false,
          braceDepth: 0,
          skipCopy: false,
        })
        pendingProp = null
        i++
        continue
      }
      if (char === "<") {
        i++
        continue
      }
      const start = i
      while (i < source.length && source[i] !== "{" && source[i] !== "<") i++
      const raw = source.slice(start, i)
      if (!isNonCopyLiteral(source, start, i, raw)) {
        pushHit(hits, source, start, raw, "jsx-text", allowlist)
      }
      continue
    }

    if (frame.mode === "jsx-tag") {
      if (char === "'" || char === '"') {
        const parsed = readString(source, i)
        if (!parsed) {
          i++
          continue
        }
        if (pendingProp && COPY_ATTRS.has(pendingProp)) {
          pushHit(hits, source, i, parsed.value, "attribute", allowlist)
        }
        pendingProp = null
        i = parsed.end
        continue
      }
      if (char === "`") {
        const parsed = readTemplateStatic(source, i)
        if (!parsed) {
          i++
          continue
        }
        if (pendingProp && COPY_ATTRS.has(pendingProp)) {
          pushTemplateSegments(
            hits,
            source,
            parsed.segments,
            "attribute",
            allowlist,
          )
        }
        pendingProp = null
        i = parsed.end
        continue
      }
      if (char === "{") {
        const render = pendingProp !== null && COPY_ATTRS.has(pendingProp)
        stack.push({
          mode: "code",
          renderStrings: render,
          braceDepth: 1,
          skipCopy: isClassNameProp(pendingProp),
        })
        pendingProp = null
        i++
        continue
      }
      if (char === ">") {
        frame.mode = "jsx-text"
        pendingProp = null
        i++
        continue
      }
      if (char === "/" && next === ">") {
        stack.pop()
        pendingProp = null
        i += 2
        continue
      }
      if (/[A-Za-z]/.test(char)) {
        const start = i
        while (i < source.length && /[A-Za-z0-9_:-]/.test(source[i])) i++
        const name = source.slice(start, i)
        let j = i
        while (j < source.length && /\s/.test(source[j])) j++
        if (source[j] === "=") {
          pendingProp = name
          i = j + 1
          continue
        }
        pendingProp = null
        continue
      }
      i++
      continue
    }

    if (char === "'" || char === '"') {
      const parsed = readString(source, i)
      if (!parsed) {
        i++
        continue
      }
      const prop = pendingProp
      const utilityString =
        frame.skipCopy ||
        cnDepth > 0 ||
        isClassNameProp(prop) ||
        isUtilityClassString(parsed.value)
      if (
        prop &&
        LABEL_MAP_PROPS.has(prop) &&
        frame.mode === "code" &&
        !isPathLiteral(parsed.value) &&
        !isCatalogKey(parsed.value)
      ) {
        pushHit(hits, source, i, parsed.value, "label-map", allowlist)
      } else if (
        (frame.renderStrings || toastCall) &&
        !utilityString &&
        !isPathLiteral(parsed.value) &&
        !isNonCopyLiteral(source, i, parsed.end, parsed.value)
      ) {
        pushHit(
          hits,
          source,
          i,
          parsed.value,
          toastCall ? "toast" : "jsx-text",
          allowlist,
        )
      }
      pendingProp = null
      toastCall = false
      i = parsed.end
      continue
    }

    if (char === "`") {
      const parsed = readTemplateStatic(source, i)
      if (!parsed) {
        i++
        continue
      }
      if (
        (frame.renderStrings || toastCall) &&
        !frame.skipCopy &&
        cnDepth === 0 &&
        !isComparisonOperand(source, i, parsed.end)
      ) {
        pushTemplateSegments(
          hits,
          source,
          parsed.segments,
          toastCall ? "toast" : "jsx-text",
          allowlist,
        )
      }
      toastCall = false
      i = parsed.end
      continue
    }

    if (char === "{") {
      if (frame.braceDepth > 0) frame.braceDepth++
      i++
      continue
    }
    if (char === "}") {
      if (frame.braceDepth > 1) {
        frame.braceDepth--
        i++
        continue
      }
      if (frame.braceDepth === 1 && stack.length > 1) {
        stack.pop()
        i++
        continue
      }
      i++
      continue
    }

    if (char === "(") {
      if (cnDepth > 0) cnDepth++
      pendingProp = null
      i++
      continue
    }
    if (char === ")") {
      if (cnDepth > 0) cnDepth--
      pendingProp = null
      i++
      continue
    }

    if (startsJsx(source, i)) {
      stack.push({
        mode: "jsx-tag",
        renderStrings: false,
        braceDepth: 0,
        skipCopy: false,
      })
      pendingProp = null
      i++
      continue
    }

    if (/[A-Za-z_$]/.test(char)) {
      const start = i
      while (i < source.length && isIdentChar(source[i])) i++
      const name = source.slice(start, i)
      let j = i
      while (j < source.length && /\s/.test(source[j])) j++
      if (source[j] === ":") {
        pendingProp = name
        i = j + 1
        continue
      }
      if (
        name === "toast" &&
        source[j] === "." &&
        /[A-Za-z]/.test(source[j + 1] ?? "")
      ) {
        const methodStart = j + 1
        let methodEnd = methodStart
        while (methodEnd < source.length && isIdentChar(source[methodEnd]))
          methodEnd++
        const method = source.slice(methodStart, methodEnd)
        let k = methodEnd
        while (k < source.length && /\s/.test(source[k])) k++
        if (TOAST_METHODS.has(method) && source[k] === "(") {
          toastCall = true
          i = k + 1
          continue
        }
      }
      if (name === "toast" && source[j] === "(") {
        toastCall = true
        i = j + 1
        continue
      }
      if (name === "cn" && source[j] === "(") {
        cnDepth++
        i = j + 1
        continue
      }
      if (activeTranslators.has(name)) {
        const callOpen = translatorCallOpen(source, i)
        if (callOpen !== null) {
          skipFirstArg = true
          pendingProp = null
          i = callOpen
          continue
        }
      }
      if (LOCALE_FORMAT_METHODS.has(name) && source[j] === "(") {
        skipFirstArg = true
        pendingProp = null
        i = j + 1
        continue
      }
      pendingProp = null
      continue
    }

    if (char !== ":" && char !== "=" && !/\s/.test(char)) pendingProp = null
    i++
  }

  return hits
}

export function importsNextIntl(source: string): boolean {
  return /import\s+(?:type\s+)?\{[\s\S]*?\b(?:useTranslations|getTranslations)\b[\s\S]*?\}\s*from\s*["']next-intl(?:\/server)?["']/.test(
    source,
  )
}

type TranslatorBinding = {
  name: string
  namespace: string | null
  index: number
}

function translatorBindings(source: string): TranslatorBinding[] {
  const bindings: TranslatorBinding[] = []
  const pattern =
    /(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:await\s+)?(?:useTranslations|getTranslations)\(\s*(?:["']([^"']+)["'])?\s*\)/g
  let match: RegExpExecArray | null
  while ((match = pattern.exec(source))) {
    bindings.push({
      name: match[1],
      namespace: match[2] ?? null,
      index: match.index,
    })
  }
  return bindings
}

function catalogKey(namespace: string | null, key: string): string {
  if (!namespace) return key
  if (key === namespace || key.startsWith(`${namespace}.`)) return key
  return `${namespace}.${key}`
}

/** Catalog keys referenced by `t("…")` / `t.rich("…")` calls. */
export function extractTranslationKeys(source: string): string[] {
  const bindings = translatorBindings(source)
  if (bindings.length === 0) return []
  const keys: string[] = []
  const seen = new Set<string>()
  for (const binding of bindings) {
    const call = new RegExp(
      `\\b${binding.name}\\s*(?:\\.\\s*(?:rich|markup|raw|has)\\s*)?\\(\\s*["']([^"']+)["']`,
      "g",
    )
    let match: RegExpExecArray | null
    while ((match = call.exec(source))) {
      if (match.index < binding.index) continue
      const later = bindings.find(
        (candidate) =>
          candidate.name === binding.name &&
          candidate.index > binding.index &&
          candidate.index < match!.index,
      )
      if (later) continue
      const full = catalogKey(binding.namespace, match[1])
      if (seen.has(full)) continue
      seen.add(full)
      keys.push(full)
    }
  }
  return keys
}

/** Keys that are missing or not a non-empty string in `fr` or `en`. */
export function unresolvedCatalogKeys(keys: readonly string[]): string[] {
  const problems: string[] = []
  for (const key of keys) {
    const frValue = resolveLeaf(fr, key)
    const enValue = resolveLeaf(en, key)
    if (typeof frValue !== "string" || frValue.trim().length === 0) {
      problems.push(`fr ${key}`)
    }
    if (typeof enValue !== "string" || enValue.trim().length === 0) {
      problems.push(`en ${key}`)
    }
  }
  return problems
}
