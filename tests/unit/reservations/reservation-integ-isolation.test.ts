import { globSync, readFileSync } from "node:fs"
import path from "node:path"
import ts from "typescript"
import { describe, expect, it } from "vitest"

const root = process.cwd()
const INTEG_GLOB = "tests/integration/reservations/*.integ.test.ts"
const HELPER_MODULE = "@/lib/scheduling/hours-mutation-target"
const HELPER_NAME = "assertIsolatedHoursMutationTarget"
const WRITE_HOOKS = ["beforeAll", "afterEach", "afterAll"] as const

function discoverReservationIntegSuites(): string[] {
  return globSync(INTEG_GLOB, { cwd: root }).sort()
}

function parseSuite(rel: string): ts.SourceFile {
  const text = readFileSync(path.join(root, rel), "utf8")
  return ts.createSourceFile(
    rel,
    text,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  )
}

function hasNamedHelperImport(source: ts.SourceFile): boolean {
  return source.statements.some((statement) => {
    if (!ts.isImportDeclaration(statement)) return false
    if (!ts.isStringLiteral(statement.moduleSpecifier)) return false
    if (statement.moduleSpecifier.text !== HELPER_MODULE) return false
    const bindings = statement.importClause?.namedBindings
    if (!bindings || !ts.isNamedImports(bindings)) return false
    return bindings.elements.some(
      (element) =>
        element.propertyName?.text === HELPER_NAME ||
        element.name.text === HELPER_NAME,
    )
  })
}

function isHelperCall(expression: ts.Expression): boolean {
  const callee = ts.isAwaitExpression(expression)
    ? expression.expression
    : expression
  return (
    ts.isCallExpression(callee) &&
    ts.isIdentifier(callee.expression) &&
    callee.expression.text === HELPER_NAME
  )
}

function firstStatementIsHelperCall(body: ts.ConciseBody): boolean {
  if (!ts.isBlock(body)) return isHelperCall(body)
  const first = body.statements[0]
  return (
    !!first && ts.isExpressionStatement(first) && isHelperCall(first.expression)
  )
}

function hookCallbackBodies(
  source: ts.SourceFile,
  hook: (typeof WRITE_HOOKS)[number],
): ts.ConciseBody[] {
  const bodies: ts.ConciseBody[] = []
  function visit(node: ts.Node) {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === hook
    ) {
      const callback = node.arguments[0]
      if (
        callback &&
        (ts.isArrowFunction(callback) || ts.isFunctionExpression(callback))
      ) {
        bodies.push(callback.body)
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  return bodies
}

describe("reservation integ isolation pin (RES-ISO)", () => {
  it("reservation integ suites call assertIsolatedHoursMutationTarget before mutating writes", () => {
    const files = discoverReservationIntegSuites()
    const failures: string[] = []

    if (files.length === 0) {
      failures.push(`glob ${INTEG_GLOB} matched no suites`)
    }

    for (const rel of files) {
      const source = parseSuite(rel)
      if (!hasNamedHelperImport(source)) {
        failures.push(
          `${rel}: missing import of ${HELPER_NAME} from "${HELPER_MODULE}"`,
        )
      }

      for (const hook of WRITE_HOOKS) {
        const bodies = hookCallbackBodies(source, hook)
        if (hook === "beforeAll" && bodies.length === 0) {
          failures.push(`${rel}: missing beforeAll`)
        }
        for (const [index, body] of bodies.entries()) {
          if (!firstStatementIsHelperCall(body)) {
            failures.push(
              `${rel}: ${hook}[${index}] first statement is not ${HELPER_NAME}()`,
            )
          }
        }
      }
    }

    expect(failures, failures.join("\n")).toEqual([])
  })
})
