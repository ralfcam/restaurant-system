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
    callee.expression.text === HELPER_NAME &&
    callee.arguments.length === 0
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

    const explicitUrlSource = ts.createSourceFile(
      "synthetic-explicit-url.integ.test.ts",
      'beforeAll(() => { assertIsolatedHoursMutationTarget("http://127.0.0.1:54321") })',
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    )
    const explicitUrlBodies = hookCallbackBodies(explicitUrlSource, "beforeAll")
    if (explicitUrlBodies.some((body) => firstStatementIsHelperCall(body))) {
      failures.push("scan accepted an explicit-URL helper call")
    }

    expect(failures, failures.join("\n")).toEqual([])
  })
})

const SIBLING_PRIVILEGES_SUITE =
  "tests/integration/security/sibling-privileges.integ.test.ts"
const TRIGGER_ACL_TITLE =
  "local reset keeps validate_reservation_availability trigger-only and denies guest EXECUTE"

function isNotAuthEnvReady(expression: ts.Expression): boolean {
  return (
    ts.isPrefixUnaryExpression(expression) &&
    expression.operator === ts.SyntaxKind.ExclamationToken &&
    ts.isIdentifier(expression.operand) &&
    expression.operand.text === "authEnvReady"
  )
}

function isAuthEnvSkipIfDescribe(node: ts.Node): node is ts.CallExpression {
  if (!ts.isCallExpression(node)) return false
  const skipIfCall = node.expression
  if (!ts.isCallExpression(skipIfCall)) return false
  if (!ts.isPropertyAccessExpression(skipIfCall.expression)) return false
  if (
    !ts.isIdentifier(skipIfCall.expression.expression) ||
    skipIfCall.expression.expression.text !== "describe"
  ) {
    return false
  }
  if (skipIfCall.expression.name.text !== "skipIf") return false
  const condition = skipIfCall.arguments[0]
  return !!condition && isNotAuthEnvReady(condition)
}

function isPlainDescribe(node: ts.Node): node is ts.CallExpression {
  return (
    ts.isCallExpression(node) &&
    ts.isIdentifier(node.expression) &&
    node.expression.text === "describe"
  )
}

function isDescribeLike(node: ts.Node): node is ts.CallExpression {
  return isPlainDescribe(node) || isAuthEnvSkipIfDescribe(node)
}

function isItOrTestCall(node: ts.Node): node is ts.CallExpression {
  return (
    ts.isCallExpression(node) &&
    ts.isIdentifier(node.expression) &&
    (node.expression.text === "it" || node.expression.text === "test")
  )
}

function callTitle(node: ts.CallExpression): string | undefined {
  const title = node.arguments[0]
  if (!title) return undefined
  if (ts.isStringLiteral(title) || ts.isNoSubstitutionTemplateLiteral(title)) {
    return title.text
  }
  return undefined
}

function collectTriggerAclTests(source: ts.SourceFile): ts.CallExpression[] {
  const matches: ts.CallExpression[] = []
  function visit(node: ts.Node) {
    if (isItOrTestCall(node) && callTitle(node) === TRIGGER_ACL_TITLE) {
      matches.push(node)
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  return matches
}

function isDescendantOfAuthEnvSkipIf(node: ts.Node): boolean {
  let current: ts.Node | undefined = node.parent
  while (current) {
    if (isAuthEnvSkipIfDescribe(current)) return true
    current = current.parent
  }
  return false
}

function owningDescribe(node: ts.Node): ts.CallExpression | undefined {
  let current: ts.Node | undefined = node.parent
  while (current) {
    if (isDescribeLike(current)) return current
    current = current.parent
  }
  return undefined
}

function describeCallbackBody(
  describeCall: ts.CallExpression,
): ts.ConciseBody | undefined {
  const callback = describeCall.arguments[1]
  if (
    callback &&
    (ts.isArrowFunction(callback) || ts.isFunctionExpression(callback))
  ) {
    return callback.body
  }
  return undefined
}

function ownBeforeAllBodies(describeCall: ts.CallExpression): ts.ConciseBody[] {
  const callback = describeCallbackBody(describeCall)
  if (!callback) return []
  const bodies: ts.ConciseBody[] = []
  function visit(node: ts.Node, nestedDescribe: boolean) {
    if (node !== describeCall && isDescribeLike(node)) {
      ts.forEachChild(node, (child) => visit(child, true))
      return
    }
    if (
      !nestedDescribe &&
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "beforeAll"
    ) {
      const hookCallback = node.arguments[0]
      if (
        hookCallback &&
        (ts.isArrowFunction(hookCallback) ||
          ts.isFunctionExpression(hookCallback))
      ) {
        bodies.push(hookCallback.body)
      }
    }
    ts.forEachChild(node, (child) => visit(child, nestedDescribe))
  }
  visit(callback, false)
  return bodies
}

describe("RES-TRIGGER-EXEC-AUTHLESS", () => {
  it("RES-TRIGGER-EXEC local catalog coverage is outside the auth environment skip and retains its local guard", () => {
    const source = parseSuite(SIBLING_PRIVILEGES_SUITE)
    const tests = collectTriggerAclTests(source)
    expect(tests).toHaveLength(1)

    const [triggerAclTest] = tests
    expect(
      isDescendantOfAuthEnvSkipIf(triggerAclTest),
      `${SIBLING_PRIVILEGES_SUITE}: "${TRIGGER_ACL_TITLE}" is nested under describe.skipIf(!authEnvReady)`,
    ).toBe(false)

    const owner = owningDescribe(triggerAclTest)
    expect(
      owner && isPlainDescribe(owner),
      `${SIBLING_PRIVILEGES_SUITE}: "${TRIGGER_ACL_TITLE}" must live in a dedicated plain describe (not describe.skipIf)`,
    ).toBe(true)

    const beforeAllBodies = owner ? ownBeforeAllBodies(owner) : []
    expect(
      beforeAllBodies.length > 0 &&
        beforeAllBodies.every((body) => firstStatementIsHelperCall(body)),
      `${SIBLING_PRIVILEGES_SUITE}: owning describe beforeAll must start with ${HELPER_NAME}()`,
    ).toBe(true)
  })
})
