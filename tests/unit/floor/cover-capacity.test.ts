import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  requireStaffUser: vi.fn(),
  createServiceClient: vi.fn(),
  upsert: vi.fn(),
  revalidatePath: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}))

vi.mock("@/lib/supabase/require-staff", () => ({
  requireStaffUser: mocks.requireStaffUser,
}))

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: (...args: unknown[]) =>
    mocks.createServiceClient(...args),
}))

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}))

const root = process.cwd()

function read(rel: string) {
  return readFileSync(path.join(root, rel), "utf8")
}

function sliceBalanced(source: string, marker: string) {
  const start = source.indexOf(marker)
  if (start < 0) return ""
  const open = source.indexOf("{", start)
  if (open < 0) return ""
  let depth = 0
  for (let i = open; i < source.length; i++) {
    if (source[i] === "{") depth += 1
    else if (source[i] === "}") {
      depth -= 1
      if (depth === 0) return source.slice(start, i + 1)
    }
  }
  return ""
}

function readOptional(rel: string) {
  try {
    return read(rel)
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "ENOENT"
    ) {
      return ""
    }
    throw error
  }
}

function revokesCoverCapacityExecute(sql: string, role: string) {
  return [...sql.matchAll(/REVOKE\b[^;]*;/gi)].some((match) => {
    const statement = match[0]
    if (!/enforce_cover_capacity/i.test(statement)) return false
    if (!/\b(?:EXECUTE|ALL)\b/i.test(statement)) return false
    return new RegExp(`\\b${role}\\b`, "i").test(statement)
  })
}

const emptyRow = { data: null, error: null as null }

function queryChain(
  result: { data: unknown; error: null } = emptyRow,
  methods: Record<string, (...args: unknown[]) => unknown> = {},
) {
  const promise = Promise.resolve(result)
  return new Proxy(promise, {
    get(target, prop, receiver) {
      if (typeof prop === "string" && Object.hasOwn(methods, prop)) {
        return methods[prop]
      }
      if (prop === "then" || prop === "catch" || prop === "finally") {
        const value = Reflect.get(target, prop, receiver)
        return typeof value === "function" ? value.bind(target) : value
      }
      if (typeof prop !== "string") return Reflect.get(target, prop, receiver)
      return () => queryChain()
    },
  })
}

function checkAllowsNullOrAtLeastOne(sql: string) {
  const checks = sql.match(/CHECK\s*\((?:[^()]|\([^()]*\))*\)/gi) ?? []
  return checks.some((clause) => {
    if (!/\bmax_cover_capacity\b/i.test(clause)) return false
    return (
      /max_cover_capacity\s+IS\s+NULL/i.test(clause) &&
      /\bOR\b/i.test(clause) &&
      /max_cover_capacity\s*>=\s*1\b/.test(clause)
    )
  })
}

describe("restaurant cover capacity", () => {
  it("CC-2 nullable ceiling and guest cannot write it", () => {
    const baseline = read("supabase/migrations/00000000000000_baseline.sql")

    const alterDecl =
      baseline.match(
        /ALTER TABLE restaurant_settings ADD COLUMN IF NOT EXISTS max_cover_capacity\s+INT(?:EGER)?\b[^;]*/i,
      )?.[0] ?? null
    const createBody =
      baseline.match(
        /CREATE TABLE IF NOT EXISTS restaurant_settings\s*\(([\s\S]*?)\)\s*;/i,
      )?.[1] ?? ""
    const createDecl =
      createBody.match(/\bmax_cover_capacity\s+INT(?:EGER)?\b[^,\n]*/i)?.[0] ??
      null

    expect(alterDecl ?? createDecl ?? "").toMatch(
      /max_cover_capacity\s+INT(?:EGER)?\b/i,
    )
    for (const decl of [alterDecl, createDecl]) {
      if (!decl) continue
      expect(decl).not.toMatch(/\bNOT\s+NULL\b/i)
    }

    expect(checkAllowsNullOrAtLeastOne(baseline)).toBe(true)

    expect(baseline).toContain(
      "REVOKE INSERT, UPDATE, DELETE ON TABLE restaurant_settings FROM anon, authenticated",
    )

    const guestWriteGrants = [
      ...baseline.matchAll(
        /GRANT\s+([^;]*?)\s+ON\s+(?:TABLE\s+)?restaurant_settings\s+TO\s+([^;]+);/gi,
      ),
    ].filter(([, privileges, roles]) => {
      if (!/\b(?:anon|authenticated)\b/i.test(roles)) return false
      return (
        /\b(?:INSERT|UPDATE|DELETE|ALL)\b/i.test(privileges) ||
        /\bmax_cover_capacity\b/i.test(privileges)
      )
    })
    expect(guestWriteGrants.map(([statement]) => statement)).toEqual([])
  })

  it("CC-1 staff gate and floor control", async () => {
    const proxy = read("lib/supabase/proxy.ts")
    expect(proxy).toContain('["/admin", "/pos", "/kds"]')
    expect(proxy).toContain('url.pathname = user ? "/" : "/auth/login"')

    const floor = read("components/staff/floor-plan.tsx")
    const inspectorStart = floor.indexOf("{selected ?")
    const chrome = floor.slice(0, inspectorStart)
    const inspector = floor.slice(inspectorStart)
    expect(chrome).toContain('data-testid="floor-max-cover-capacity"')
    expect(inspector).not.toContain('data-testid="floor-max-cover-capacity"')

    const actions = (await import("@/app/actions/operations")) as {
      setMaxCoverCapacity?: (value: number | null) => Promise<unknown>
    }
    expect(typeof actions.setMaxCoverCapacity).toBe("function")
    const setMaxCoverCapacity = actions.setMaxCoverCapacity!

    const operations = read("app/actions/operations.ts")
    const marker = "function setMaxCoverCapacity"
    const start = operations.indexOf(marker)
    const body =
      start < 0
        ? ""
        : operations.slice(
            start,
            operations.indexOf("\nexport ", start + marker.length) === -1
              ? operations.length
              : operations.indexOf("\nexport ", start + marker.length),
          )
    const staffAt = body.indexOf("requireStaffUser")
    const serviceAt = body.indexOf("createServiceClient")
    expect(staffAt).toBeGreaterThanOrEqual(0)
    expect(serviceAt).toBeGreaterThan(staffAt)

    mocks.upsert.mockResolvedValue({ error: null })
    mocks.createServiceClient.mockImplementation(() => ({
      from: (table: string) => ({
        select: (columns: string) =>
          table === "tables" && columns === "seats"
            ? Promise.resolve({ data: [{ seats: 2 }], error: null })
            : Promise.resolve({ data: null, error: null }),
        upsert: (row: unknown) => mocks.upsert(table, row),
      }),
    }))

    mocks.requireStaffUser.mockResolvedValue(null)
    mocks.upsert.mockClear()
    await expect(setMaxCoverCapacity(40)).rejects.toThrow(
      "errors.operations.unauthorized",
    )
    expect(mocks.upsert).not.toHaveBeenCalled()

    mocks.requireStaffUser.mockResolvedValue({ id: "staff-1" })
    mocks.requireStaffUser.mockClear()
    mocks.createServiceClient.mockClear()
    mocks.upsert.mockClear()
    await setMaxCoverCapacity(40)
    expect(mocks.upsert).toHaveBeenCalledWith(
      "restaurant_settings",
      expect.objectContaining({ id: 1 }),
    )
    expect(mocks.requireStaffUser.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.createServiceClient.mock.invocationCallOrder[0]!,
    )

    mocks.requireStaffUser.mockResolvedValue({
      id: "super-1",
      app_metadata: { role: "super_admin" },
    })
    mocks.upsert.mockClear()
    await setMaxCoverCapacity(null)
    expect(mocks.upsert).toHaveBeenCalledWith(
      "restaurant_settings",
      expect.objectContaining({ id: 1 }),
    )
  })

  it("CC-4 refuses 0, negative, fraction, and non-number", async () => {
    const actions = (await import("@/app/actions/operations")) as {
      setMaxCoverCapacity?: (value: number | null) => Promise<unknown>
    }
    const setMaxCoverCapacity = actions.setMaxCoverCapacity!

    mocks.requireStaffUser.mockResolvedValue({ id: "staff-1" })
    mocks.upsert.mockResolvedValue({ error: null })
    mocks.createServiceClient.mockImplementation(() => ({
      from: (table: string) => ({
        upsert: (row: unknown) => mocks.upsert(table, row),
      }),
    }))

    const invalidValues: Array<number | string> = [0, -1, 1.5, "4"]
    for (const value of invalidValues) {
      mocks.upsert.mockClear()
      await expect(setMaxCoverCapacity(value as number)).resolves.toEqual({
        error: "errors.floor.maxCoverCapacityInvalid",
      })
      expect(mocks.upsert).not.toHaveBeenCalled()
    }
  })

  it("CC-5 refuses a maximum below the seat sum", async () => {
    const actions = (await import("@/app/actions/operations")) as {
      setMaxCoverCapacity?: (value: number | null) => Promise<unknown>
    }
    const setMaxCoverCapacity = actions.setMaxCoverCapacity!

    const tableUpdate = vi.fn(() => Promise.resolve({ error: null }))
    const tableDelete = vi.fn(() => Promise.resolve({ error: null }))

    mocks.requireStaffUser.mockResolvedValue({ id: "staff-1" })
    mocks.upsert.mockClear()
    mocks.createServiceClient.mockImplementation(() => ({
      from: (table: string) => {
        if (table === "tables") {
          return {
            select: (columns: string) =>
              columns === "seats"
                ? Promise.resolve({
                    data: [{ seats: 4 }, { seats: 6 }],
                    error: null,
                  })
                : Promise.resolve({ data: null, error: null }),
            update: tableUpdate,
            delete: tableDelete,
          }
        }
        if (table === "restaurant_settings") {
          return {
            upsert: (row: unknown) => {
              mocks.upsert("restaurant_settings", row)
              return Promise.resolve({ error: null })
            },
          }
        }
        return {}
      },
    }))

    tableUpdate.mockClear()
    tableDelete.mockClear()
    await expect(setMaxCoverCapacity(9)).resolves.toEqual({
      error: "errors.floor.maxCoverCapacityBelowSum",
    })
    expect(mocks.upsert).not.toHaveBeenCalled()
    expect(tableUpdate).not.toHaveBeenCalled()
    expect(tableDelete).not.toHaveBeenCalled()

    mocks.upsert.mockClear()
    await setMaxCoverCapacity(10)
    expect(mocks.upsert).toHaveBeenCalledWith(
      "restaurant_settings",
      expect.objectContaining({ id: 1, max_cover_capacity: 10 }),
    )
  })

  it("CC-16 does not call a seat-read failure a below-sum refusal", async () => {
    const actions = (await import("@/app/actions/operations")) as {
      setMaxCoverCapacity?: (value: number | null) => Promise<unknown>
    }
    const setMaxCoverCapacity = actions.setMaxCoverCapacity!

    mocks.requireStaffUser.mockResolvedValue({ id: "staff-1" })
    mocks.upsert.mockClear()
    mocks.createServiceClient.mockImplementation(() => ({
      from: (table: string) => {
        if (table === "tables") {
          return {
            select: (columns: string) =>
              columns === "seats"
                ? Promise.resolve({
                    data: null,
                    error: { message: "seat read failed" },
                  })
                : Promise.resolve({ data: null, error: null }),
          }
        }
        if (table === "restaurant_settings") {
          return {
            upsert: (row: unknown) => {
              mocks.upsert("restaurant_settings", row)
              return Promise.resolve({ error: null })
            },
          }
        }
        return {}
      },
    }))

    await expect(setMaxCoverCapacity(10)).rejects.toThrow(
      "errors.floor.maxCoverCapacitySaveFailed",
    )
    expect(mocks.upsert).not.toHaveBeenCalled()
  })

  it("CC-3 unset maximum blocks create and seat increase", async () => {
    const empty = { data: null, error: null as null }
    const tables = [{ label: "1", x: 0, y: 0, seats: 4 }]
    const current = { status: "available", x: 0, y: 0, seats: 4 }
    const inserted = {
      id: "t-new",
      label: "2",
      seats: 2,
      status: "available",
      x: 1,
      y: 1,
      shape: "square",
      expected_minutes: 90,
    }

    function chain(
      result: { data: unknown; error: null } = empty,
      methods: Record<string, (...args: unknown[]) => unknown> = {},
    ) {
      const promise = Promise.resolve(result)
      return new Proxy(promise, {
        get(target, prop, receiver) {
          if (typeof prop === "string" && Object.hasOwn(methods, prop)) {
            return methods[prop]
          }
          if (prop === "then" || prop === "catch" || prop === "finally") {
            const value = Reflect.get(target, prop, receiver)
            return typeof value === "function" ? value.bind(target) : value
          }
          if (typeof prop !== "string")
            return Reflect.get(target, prop, receiver)
          return () => chain()
        },
      })
    }

    function loose() {
      const promise = Promise.resolve(empty)
      const proxy: unknown = new Proxy(() => proxy, {
        apply: () => proxy,
        get(_target, prop) {
          if (prop === "then") return promise.then.bind(promise)
          if (prop === "catch") return promise.catch.bind(promise)
          if (prop === "finally") return promise.finally.bind(promise)
          if (
            prop === "toJSON" ||
            prop === "toString" ||
            prop === "valueOf" ||
            typeof prop !== "string"
          ) {
            return undefined
          }
          return proxy
        },
      })
      return proxy
    }

    mocks.requireStaffUser.mockResolvedValue({ id: "staff-1" })
    mocks.insert.mockClear()
    mocks.update.mockClear()
    mocks.delete.mockClear()
    mocks.createServiceClient.mockImplementation(() => ({
      from: (table: string) => {
        if (table === "restaurant_settings") {
          return {
            select: () =>
              chain(empty, {
                eq: () =>
                  chain(empty, {
                    maybeSingle: () =>
                      chain({
                        data: { max_cover_capacity: null },
                        error: null,
                      }),
                  }),
              }),
          }
        }
        if (table === "tables") {
          return {
            select: () =>
              chain(empty, {
                order: () => chain({ data: tables, error: null }),
                eq: () =>
                  chain(empty, {
                    single: () => chain({ data: current, error: null }),
                  }),
              }),
            insert: (row: unknown) => {
              mocks.insert(row)
              return {
                select: () => ({
                  single: async () => ({ data: inserted, error: null }),
                }),
              }
            },
            update: (patch: unknown) => ({
              eq: async () => {
                mocks.update(patch)
                return { error: null }
              },
            }),
            delete: () => ({
              eq: async () => {
                mocks.delete()
                return { error: null }
              },
            }),
          }
        }
        if (table === "table_merge_members") {
          return {
            select: () =>
              chain(empty, {
                eq: () =>
                  chain(empty, {
                    maybeSingle: () => chain(empty),
                  }),
              }),
          }
        }
        return loose()
      },
    }))

    const actions = (await import("@/app/actions/operations")) as {
      createTable: () => Promise<unknown>
      updateTableState: (input: {
        id: string
        seats?: number
      }) => Promise<unknown>
      deleteTable: (id: string) => Promise<unknown>
    }

    await expect(actions.createTable()).resolves.toEqual({
      error: "errors.floor.maxCoverCapacityUnset",
    })
    expect(mocks.insert).not.toHaveBeenCalled()

    mocks.update.mockClear()
    await expect(
      actions.updateTableState({ id: "t1", seats: 6 }),
    ).resolves.toEqual({
      error: "errors.floor.maxCoverCapacityUnset",
    })
    expect(mocks.update).not.toHaveBeenCalled()

    mocks.update.mockClear()
    await actions.updateTableState({ id: "t1", seats: 2 })
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({ seats: 2 }),
    )

    mocks.delete.mockClear()
    await actions.deleteTable("t1")
    expect(mocks.delete).toHaveBeenCalled()

    const floor = read("components/staff/floor-plan.tsx")
    const markerAt = floor.indexOf("{selected ?")
    expect(floor.slice(0, markerAt)).toContain(
      'data-testid="floor-max-cover-prompt"',
    )
  })

  it("CC-6 refuses a sum above the maximum", async () => {
    const empty = { data: null, error: null as null }
    const current = { status: "available", x: 0, y: 0, seats: 4 }
    let orderedTables: Array<{
      id: string
      label: string
      x: number
      y: number
      seats: number
    }> = [
      { id: "t1", label: "1", x: 0, y: 0, seats: 4 },
      { id: "t2", label: "2", x: 1, y: 0, seats: 4 },
    ]
    const inserted = {
      id: "t-new",
      label: "3",
      seats: 2,
      status: "available",
      x: 2,
      y: 0,
      shape: "square",
      expected_minutes: 90,
    }

    function chain(
      result: { data: unknown; error: null } = empty,
      methods: Record<string, (...args: unknown[]) => unknown> = {},
    ) {
      const promise = Promise.resolve(result)
      return new Proxy(promise, {
        get(target, prop, receiver) {
          if (typeof prop === "string" && Object.hasOwn(methods, prop)) {
            return methods[prop]
          }
          if (prop === "then" || prop === "catch" || prop === "finally") {
            const value = Reflect.get(target, prop, receiver)
            return typeof value === "function" ? value.bind(target) : value
          }
          if (typeof prop !== "string")
            return Reflect.get(target, prop, receiver)
          return () => chain()
        },
      })
    }

    mocks.requireStaffUser.mockResolvedValue({ id: "staff-1" })
    mocks.insert.mockClear()
    mocks.update.mockClear()
    mocks.createServiceClient.mockImplementation(() => ({
      from: (table: string) => {
        if (table === "restaurant_settings") {
          return {
            select: () =>
              chain(empty, {
                eq: () =>
                  chain(empty, {
                    maybeSingle: () =>
                      chain({
                        data: { max_cover_capacity: 10 },
                        error: null,
                      }),
                  }),
              }),
          }
        }
        if (table === "tables") {
          return {
            select: () =>
              chain(empty, {
                order: () => chain({ data: orderedTables, error: null }),
                eq: () =>
                  chain(empty, {
                    single: () => chain({ data: current, error: null }),
                  }),
              }),
            insert: (row: unknown) => {
              mocks.insert(row)
              return {
                select: () => ({
                  single: async () => ({ data: inserted, error: null }),
                }),
              }
            },
            update: (patch: unknown) => ({
              eq: async () => {
                mocks.update(patch)
                return { error: null }
              },
            }),
          }
        }
        return {
          select: () => chain(),
        }
      },
    }))

    const actions = (await import("@/app/actions/operations")) as {
      createTable: () => Promise<unknown>
      updateTableState: (input: {
        id: string
        seats?: number
      }) => Promise<unknown>
    }

    await actions.createTable()
    expect(mocks.insert).toHaveBeenCalled()

    orderedTables = [
      { id: "t1", label: "1", x: 0, y: 0, seats: 6 },
      { id: "t2", label: "2", x: 1, y: 0, seats: 4 },
    ]
    mocks.insert.mockClear()
    await expect(actions.createTable()).resolves.toEqual({
      error: "errors.floor.maxCoverCapacityReached",
    })
    expect(mocks.insert).not.toHaveBeenCalled()

    orderedTables = [
      { id: "t1", label: "1", x: 0, y: 0, seats: 4 },
      { id: "t2", label: "2", x: 1, y: 0, seats: 4 },
    ]
    mocks.update.mockClear()
    await expect(
      actions.updateTableState({ id: "t1", seats: 8 }),
    ).resolves.toEqual({
      error: "errors.floor.maxCoverCapacityReached",
    })
    expect(mocks.update).not.toHaveBeenCalled()

    mocks.update.mockClear()
    await actions.updateTableState({ id: "t1", seats: 6 })
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({ seats: 6 }),
    )

    const messages = JSON.parse(read("messages/en.json")) as {
      errors: { floor: { maxCoverCapacityReached?: string } }
    }
    expect(messages.errors.floor.maxCoverCapacityReached).toBe(
      "The restaurant's maximum cover capacity has been reached.",
    )
  })

  it("CC-6 returns the reached key and the floor shows it", async () => {
    const capacityKeys = [
      "errors.floor.maxCoverCapacityReached",
      "errors.floor.maxCoverCapacityBelowSum",
      "errors.floor.maxCoverCapacityUnset",
      "errors.floor.maxCoverCapacityInvalid",
    ]
    const returnedErrorToast = /t\(\s*(?:result\??\.)?error\s*\)/
    const returnedErrorCheck =
      /"error"\s+in\s+|if\s*\(\s*(?:result\??\.)?error\b|result\??\.error\b|\{\s*error\b/

    const floor = read("components/staff/floor-plan.tsx")
    const addTableBody = sliceBalanced(floor, "async function addTable(")
    const adjustSeatsBody = sliceBalanced(floor, "async function adjustSeats(")
    const blurBody = sliceBalanced(floor, "onBlur={(event) => {")
    expect(addTableBody).toContain("createTable")
    expect(adjustSeatsBody).toContain("updateTableState")
    expect(blurBody).toContain("setMaxCoverCapacity")

    const capacityInputAt = floor.indexOf(
      'data-testid="floor-max-cover-capacity"',
    )
    expect(capacityInputAt).toBeGreaterThanOrEqual(0)
    const inputStart = floor.lastIndexOf("<Input", capacityInputAt)
    const attributes = floor.slice(
      inputStart,
      floor.indexOf("onBlur", capacityInputAt),
    )
    expect(attributes).not.toMatch(/\bvalue\s*=/)

    for (const [name, body] of [
      ["addTable", addTableBody],
      ["adjustSeats", adjustSeatsBody],
      ["ceiling onBlur", blurBody],
    ] as const) {
      expect
        .soft(body, `${name} toasts t of a returned error`)
        .toMatch(returnedErrorToast)
      expect
        .soft(body, `${name} checks a returned error`)
        .toMatch(returnedErrorCheck)
    }

    const current = { status: "available", x: 0, y: 0, seats: 4 }
    let ceiling = 10
    let orderedTables: Array<{ seats: number; label: string }> = [
      { label: "1", seats: 6 },
      { label: "2", seats: 4 },
    ]
    let insertError: { message: string } | null = null
    let updateError: { message: string } | null = null
    let upsertError: { message: string } | null = null

    mocks.requireStaffUser.mockResolvedValue({ id: "staff-1" })
    mocks.insert.mockClear()
    mocks.update.mockClear()
    mocks.upsert.mockClear()
    mocks.createServiceClient.mockImplementation(() => ({
      from: (table: string) => {
        if (table === "restaurant_settings") {
          return {
            select: () =>
              queryChain(emptyRow, {
                eq: () =>
                  queryChain(emptyRow, {
                    maybeSingle: () =>
                      queryChain({
                        data: { max_cover_capacity: ceiling },
                        error: null,
                      }),
                  }),
              }),
            upsert: (row: unknown) => {
              mocks.upsert(table, row)
              return Promise.resolve({ error: upsertError })
            },
          }
        }
        if (table === "tables") {
          return {
            select: (columns: string) => {
              if (columns === "status, x, y, seats") {
                return queryChain(emptyRow, {
                  eq: () =>
                    queryChain(emptyRow, {
                      single: () => queryChain({ data: current, error: null }),
                    }),
                })
              }
              if (columns === "seats") {
                return queryChain(
                  { data: orderedTables, error: null },
                  {
                    order: () =>
                      queryChain({ data: orderedTables, error: null }),
                  },
                )
              }
              return queryChain(emptyRow, {
                order: () => queryChain({ data: orderedTables, error: null }),
              })
            },
            insert: (row: unknown) => {
              mocks.insert(row)
              return {
                select: () => ({
                  single: async () => ({ data: null, error: insertError }),
                }),
              }
            },
            update: (patch: unknown) => ({
              eq: async () => {
                mocks.update(patch)
                return { error: updateError }
              },
            }),
          }
        }
        return { select: () => queryChain() }
      },
    }))

    const actions = (await import("@/app/actions/operations")) as {
      createTable: () => Promise<unknown>
      updateTableState: (input: {
        id: string
        seats?: number
      }) => Promise<unknown>
      setMaxCoverCapacity: (value: number | null) => Promise<unknown>
    }

    async function settle(run: () => Promise<unknown>) {
      try {
        return {
          resolved: await run(),
          thrown: undefined as string | undefined,
        }
      } catch (error) {
        return {
          resolved: undefined as unknown,
          thrown: error instanceof Error ? error.message : String(error),
        }
      }
    }

    mocks.insert.mockClear()
    const overCeilingCreate = await settle(() => actions.createTable())
    expect.soft(overCeilingCreate.thrown).toBeUndefined()
    expect.soft(overCeilingCreate.resolved).toEqual({
      error: "errors.floor.maxCoverCapacityReached",
    })
    expect(mocks.insert).not.toHaveBeenCalled()

    orderedTables = [
      { label: "1", seats: 4 },
      { label: "2", seats: 4 },
    ]
    mocks.update.mockClear()
    const overCeilingSeats = await settle(() =>
      actions.updateTableState({ id: "t1", seats: 8 }),
    )
    expect.soft(overCeilingSeats.thrown).toBeUndefined()
    expect.soft(overCeilingSeats.resolved).toEqual({
      error: "errors.floor.maxCoverCapacityReached",
    })
    expect(mocks.update).not.toHaveBeenCalled()

    ceiling = 40
    orderedTables = [
      { label: "1", seats: 4 },
      { label: "2", seats: 2 },
    ]
    for (const key of capacityKeys) {
      insertError = { message: key }
      mocks.insert.mockClear()
      const inserted = await settle(() => actions.createTable())
      expect.soft(inserted.thrown).toBeUndefined()
      expect.soft(inserted.resolved).toEqual({ error: key })
      expect(mocks.insert).toHaveBeenCalled()
    }

    updateError = { message: "errors.floor.maxCoverCapacityBelowSum" }
    mocks.update.mockClear()
    const updated = await settle(() =>
      actions.updateTableState({ id: "t1", seats: 5 }),
    )
    expect.soft(updated.thrown).toBeUndefined()
    expect.soft(updated.resolved).toEqual({
      error: "errors.floor.maxCoverCapacityBelowSum",
    })
    expect(mocks.update).toHaveBeenCalled()

    upsertError = { message: "errors.floor.maxCoverCapacityInvalid" }
    mocks.upsert.mockClear()
    const saved = await settle(() => actions.setMaxCoverCapacity(30))
    expect.soft(saved.thrown).toBeUndefined()
    expect.soft(saved.resolved).toEqual({
      error: "errors.floor.maxCoverCapacityInvalid",
    })
    expect(mocks.upsert).toHaveBeenCalled()
  })

  it("CC-8 clear returns to the unset block", async () => {
    const current = { status: "available", x: 0, y: 0, seats: 4 }

    mocks.requireStaffUser.mockResolvedValue({ id: "staff-1" })
    mocks.upsert.mockReset()
    mocks.upsert.mockResolvedValue({ error: null })
    mocks.insert.mockClear()
    mocks.update.mockClear()
    mocks.createServiceClient.mockImplementation(() => ({
      from: (table: string) => {
        if (table === "restaurant_settings") {
          return {
            upsert: (row: unknown) => mocks.upsert(table, row),
            select: () =>
              queryChain(emptyRow, {
                eq: () =>
                  queryChain(emptyRow, {
                    maybeSingle: () =>
                      queryChain({
                        data: { max_cover_capacity: null },
                        error: null,
                      }),
                  }),
              }),
          }
        }
        if (table === "tables") {
          return {
            select: () =>
              queryChain(emptyRow, {
                eq: () =>
                  queryChain(emptyRow, {
                    single: () => queryChain({ data: current, error: null }),
                  }),
              }),
            insert: (row: unknown) => {
              mocks.insert(row)
              return {
                select: () => ({
                  single: async () => ({ data: null, error: null }),
                }),
              }
            },
            update: (patch: unknown) => ({
              eq: async () => {
                mocks.update(patch)
                return { error: null }
              },
            }),
          }
        }
        return {
          select: () => queryChain(),
        }
      },
    }))

    const actions = (await import("@/app/actions/operations")) as {
      setMaxCoverCapacity?: (value: number | null) => Promise<unknown>
      createTable: () => Promise<unknown>
      updateTableState: (input: {
        id: string
        seats?: number
      }) => Promise<unknown>
    }
    const setMaxCoverCapacity = actions.setMaxCoverCapacity!

    await expect(setMaxCoverCapacity(null)).resolves.toBeUndefined()
    expect(mocks.upsert).toHaveBeenCalledWith(
      "restaurant_settings",
      expect.objectContaining({ id: 1, max_cover_capacity: null }),
    )

    mocks.insert.mockClear()
    await expect(actions.createTable()).resolves.toEqual({
      error: "errors.floor.maxCoverCapacityUnset",
    })
    expect(mocks.insert).not.toHaveBeenCalled()

    mocks.update.mockClear()
    await expect(
      actions.updateTableState({ id: "t1", seats: 6 }),
    ).resolves.toEqual({
      error: "errors.floor.maxCoverCapacityUnset",
    })
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it("CC-7 lowering seats and delete reduce the sum", async () => {
    const current = { status: "available", x: 0, y: 0, seats: 4 }
    const orderedTables = [
      { id: "t1", label: "1", x: 0, y: 0, seats: 4 },
      { id: "t2", label: "2", x: 1, y: 0, seats: 6 },
    ]

    mocks.requireStaffUser.mockResolvedValue({ id: "staff-1" })
    mocks.update.mockClear()
    mocks.delete.mockClear()
    mocks.createServiceClient.mockImplementation(() => ({
      from: (table: string) => {
        if (table === "restaurant_settings") {
          return {
            select: () =>
              queryChain(emptyRow, {
                eq: () =>
                  queryChain(emptyRow, {
                    maybeSingle: () =>
                      queryChain({
                        data: { max_cover_capacity: 10 },
                        error: null,
                      }),
                  }),
              }),
          }
        }
        if (table === "tables") {
          return {
            select: () =>
              queryChain(emptyRow, {
                order: () => queryChain({ data: orderedTables, error: null }),
                eq: () =>
                  queryChain(emptyRow, {
                    single: () => queryChain({ data: current, error: null }),
                  }),
              }),
            update: (patch: unknown) => ({
              eq: async () => {
                mocks.update(patch)
                return { error: null }
              },
            }),
            delete: () => ({
              eq: async () => {
                mocks.delete()
                return { error: null }
              },
            }),
          }
        }
        if (table === "table_merge_members") {
          return {
            select: () =>
              queryChain(emptyRow, {
                eq: () =>
                  queryChain(emptyRow, {
                    maybeSingle: () => queryChain({ data: null, error: null }),
                  }),
              }),
          }
        }
        return {
          select: () => queryChain(),
        }
      },
    }))

    const actions = (await import("@/app/actions/operations")) as {
      updateTableState: (input: {
        id: string
        seats?: number
      }) => Promise<unknown>
      deleteTable: (id: string) => Promise<unknown>
    }

    const initialSum = orderedTables.reduce(
      (total, row) => total + row.seats,
      0,
    )
    await expect(
      actions.updateTableState({ id: "t1", seats: 2 }),
    ).resolves.toBeUndefined()
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({ seats: 2 }),
    )

    const patch = mocks.update.mock.calls[0]?.[0] as { seats: number }
    const previousSeats = orderedTables.find((row) => row.id === "t1")!.seats
    const removedByDrop = previousSeats - patch.seats
    const sumAfterDrop = initialSum - removedByDrop
    expect(sumAfterDrop).toBe(10 - 2)
    expect(sumAfterDrop).toBe(8)

    const projected = orderedTables.map((row) =>
      row.id === "t1" ? { ...row, seats: patch.seats } : row,
    )
    await expect(actions.deleteTable("t1")).resolves.toBeUndefined()
    expect(mocks.delete).toHaveBeenCalled()

    const deletedSeats = projected.find((row) => row.id === "t1")!.seats
    const sumAfterDelete = sumAfterDrop - deletedSeats
    expect(sumAfterDelete).toBe(8 - 2)
    expect(sumAfterDelete).toBe(6)
  })

  it("CC-9 seat clamp and neighbor rules stay", async () => {
    const current = { status: "available", x: 0, y: 0, seats: 4 }
    const orderedTables = [{ id: "t1", label: "1", x: 0, y: 0, seats: 4 }]
    const settingsSelects: string[] = []

    mocks.requireStaffUser.mockResolvedValue({ id: "staff-1" })
    mocks.update.mockClear()
    mocks.createServiceClient.mockImplementation(() => ({
      from: (table: string) => {
        if (table === "restaurant_settings") {
          return {
            select: (columns: string) => {
              settingsSelects.push(columns)
              return queryChain(emptyRow, {
                eq: () =>
                  queryChain(emptyRow, {
                    maybeSingle: () =>
                      queryChain({
                        data: { max_cover_capacity: 100 },
                        error: null,
                      }),
                  }),
              })
            },
          }
        }
        if (table === "tables") {
          return {
            select: () =>
              queryChain(emptyRow, {
                order: () => queryChain({ data: orderedTables, error: null }),
                eq: () =>
                  queryChain(emptyRow, {
                    single: () => queryChain({ data: current, error: null }),
                  }),
              }),
            update: (patch: unknown) => ({
              eq: async () => {
                mocks.update(patch)
                return { error: null }
              },
            }),
          }
        }
        return {
          select: () => queryChain(),
        }
      },
    }))

    const actions = (await import("@/app/actions/operations")) as {
      updateTableState: (input: {
        id: string
        seats?: number
      }) => Promise<unknown>
    }

    await expect(
      actions.updateTableState({ id: "t1", seats: 13 }),
    ).resolves.toBeUndefined()
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({ seats: 12 }),
    )
    expect(settingsSelects).toContain("max_cover_capacity")

    const slotLimits = read(
      "supabase/migrations/20260918140655_slot_service_cover_limits.sql",
    )
    const marker =
      "CREATE OR REPLACE FUNCTION validate_reservation_availability()"
    const start = slotLimits.indexOf(marker)
    expect(start).toBeGreaterThanOrEqual(0)
    const availability = slotLimits.slice(start)
    expect(availability).toContain("BW-9")
    expect(availability).toMatch(
      /SELECT COALESCE\(SUM\(seats\), 0\) INTO v_capacity FROM tables;/,
    )
    expect(availability).not.toContain("max_cover_capacity")
    expect(slotLimits).toMatch(/\bmax_covers\b/)
    expect(slotLimits).not.toMatch(/\bmax_cover_capacity\b/)
  })

  it("CC-11 failed seat read writes nothing and the lock is shared", async () => {
    const seatsUnavailable = {
      data: null,
      error: { message: "seats unavailable" },
    } as unknown as { data: unknown; error: null }
    const current = { status: "available", x: 0, y: 0, seats: 4 }
    const inserted = {
      id: "t-new",
      label: "1",
      seats: 2,
      status: "available",
      x: 0,
      y: 0,
      shape: "square",
      expected_minutes: 90,
    }

    mocks.requireStaffUser.mockResolvedValue({ id: "staff-1" })
    mocks.insert.mockClear()
    mocks.update.mockClear()
    mocks.createServiceClient.mockImplementation(() => ({
      from: (table: string) => {
        if (table === "restaurant_settings") {
          return {
            select: () =>
              queryChain(emptyRow, {
                eq: () =>
                  queryChain(emptyRow, {
                    maybeSingle: () =>
                      queryChain({
                        data: { max_cover_capacity: 40 },
                        error: null,
                      }),
                  }),
              }),
          }
        }
        if (table === "tables") {
          return {
            select: (columns: string) => {
              if (columns === "status, x, y, seats") {
                return queryChain(emptyRow, {
                  eq: () =>
                    queryChain(emptyRow, {
                      single: () => queryChain({ data: current, error: null }),
                    }),
                })
              }
              return queryChain(emptyRow, {
                order: () => queryChain(seatsUnavailable),
              })
            },
            insert: (row: unknown) => {
              mocks.insert(row)
              return {
                select: () => ({
                  single: async () => ({ data: inserted, error: null }),
                }),
              }
            },
            update: (patch: unknown) => ({
              eq: async () => {
                mocks.update(patch)
                return { error: null }
              },
            }),
          }
        }
        return {
          select: () => queryChain(),
        }
      },
    }))

    const actions = (await import("@/app/actions/operations")) as {
      createTable: () => Promise<unknown>
      updateTableState: (input: {
        id: string
        seats?: number
      }) => Promise<unknown>
    }

    let createError: unknown
    try {
      await actions.createTable()
    } catch (error) {
      createError = error
    }
    expect(mocks.insert).not.toHaveBeenCalled()
    expect((createError as Error | undefined)?.message).toBe(
      "errors.floor.addTableFailed",
    )

    mocks.update.mockClear()
    let updateError: unknown
    try {
      await actions.updateTableState({ id: "t1", seats: 6 })
    } catch (error) {
      updateError = error
    }
    expect(mocks.update).not.toHaveBeenCalled()
    expect((updateError as Error | undefined)?.message).toBe(
      "errors.floor.updateTableFailed",
    )

    const migrations = [
      "supabase/migrations/00000000000000_baseline.sql",
      "supabase/migrations/20261004161500_max_cover_capacity.sql",
    ]
    for (const rel of migrations) {
      const sql = readOptional(rel)
      expect(sql).toContain("pg_advisory_xact_lock(69, 1)")
      expect(sql).toContain("FUNCTION public.enforce_cover_capacity")
      expect(sql).toMatch(
        /CREATE TRIGGER\b[\s\S]*?\bBEFORE INSERT OR UPDATE OF seats\s+ON\s+(?:public\.)?tables\b[\s\S]*?\bEXECUTE\s+(?:FUNCTION|PROCEDURE)\s+(?:public\.)?enforce_cover_capacity\s*\(/i,
      )
      expect(sql).toMatch(
        /CREATE TRIGGER\b[\s\S]*?\bBEFORE INSERT OR UPDATE OF max_cover_capacity\s+ON\s+(?:public\.)?restaurant_settings\b[\s\S]*?\bEXECUTE\s+(?:FUNCTION|PROCEDURE)\s+(?:public\.)?enforce_cover_capacity\s*\(/i,
      )
      expect(revokesCoverCapacityExecute(sql, "PUBLIC")).toBe(true)
      expect(revokesCoverCapacityExecute(sql, "anon")).toBe(true)
      expect(revokesCoverCapacityExecute(sql, "authenticated")).toBe(true)
    }
  })

  it("CC-10 forward migration adds the nullable ceiling", () => {
    function expectNullableIntegerCeiling(sql: string) {
      const decl =
        sql.match(
          /ADD COLUMN IF NOT EXISTS max_cover_capacity\s+INT(?:EGER)?\b[^;]*/i,
        )?.[0] ?? ""
      expect(decl).toMatch(
        /ADD COLUMN IF NOT EXISTS max_cover_capacity\s+INT(?:EGER)?\b/i,
      )
      expect(decl).not.toMatch(/\bNOT\s+NULL\b/i)
      expect(checkAllowsNullOrAtLeastOne(sql)).toBe(true)
    }

    expectNullableIntegerCeiling(
      readOptional("supabase/migrations/20261004161500_max_cover_capacity.sql"),
    )
    expectNullableIntegerCeiling(
      read("supabase/migrations/00000000000000_baseline.sql"),
    )
  })

  it("CC-13 surfaces a failed capacity read instead of an unset ceiling", async () => {
    mocks.requireStaffUser.mockResolvedValue({ id: "staff-1" })
    mocks.insert.mockClear()
    mocks.update.mockClear()
    mocks.createServiceClient.mockImplementation(() => ({
      from: (table: string) => {
        if (table === "restaurant_settings") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: null,
                  error: {
                    message:
                      "column restaurant_settings.max_cover_capacity does not exist",
                  },
                }),
              }),
            }),
          }
        }
        if (table === "tables") {
          return {
            select: () => ({
              order: async () => ({ data: [], error: null }),
              eq: () => ({
                single: async () => ({
                  data: { status: "available", x: 0, y: 0, seats: 4 },
                  error: null,
                }),
              }),
            }),
            insert: (row: unknown) => {
              mocks.insert(row)
              return {
                select: () => ({
                  single: async () => ({ data: null, error: null }),
                }),
              }
            },
            update: (patch: unknown) => ({
              eq: async () => {
                mocks.update(patch)
                return { error: null }
              },
            }),
          }
        }
        return {}
      },
    }))

    const actions = (await import("@/app/actions/operations")) as {
      createTable: () => Promise<unknown>
      updateTableState: (input: {
        id: string
        seats?: number
      }) => Promise<unknown>
    }

    await expect(actions.createTable()).rejects.toThrow(
      "errors.floor.addTableFailed",
    )
    expect(mocks.insert).not.toHaveBeenCalled()

    await expect(
      actions.updateTableState({ id: "t1", seats: 6 }),
    ).rejects.toThrow("errors.floor.updateTableFailed")
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it("CC-14 gates getMaxCoverCapacity", async () => {
    const { getMaxCoverCapacity } =
      (await import("@/app/actions/operations")) as {
        getMaxCoverCapacity: () => Promise<number | null>
      }

    mocks.requireStaffUser.mockResolvedValue(null)
    mocks.createServiceClient.mockClear()
    await expect(getMaxCoverCapacity()).rejects.toThrow(
      "errors.operations.unauthorized",
    )
    expect(mocks.createServiceClient).not.toHaveBeenCalled()
  })

  it("CC-15 keeps the floor page up when the capacity read throws", () => {
    const page = read("app/admin/floor/page.tsx")

    expect(page).toContain("getMaxCoverCapacity")

    const open = page.indexOf("Promise.all([")
    expect(open).toBeGreaterThanOrEqual(0)
    const bodyStart = open + "Promise.all([".length
    let depth = 1
    let close = -1
    for (let i = bodyStart; i < page.length; i++) {
      const char = page[i]
      if (char === "[") depth += 1
      else if (char === "]") {
        depth -= 1
        if (depth === 0) {
          close = i
          break
        }
      }
    }
    expect(close).toBeGreaterThan(bodyStart)
    expect(page.slice(close)).toMatch(/^\]\s*\)/)
    const parallelLoads = page.slice(bodyStart, close)
    expect(parallelLoads).not.toContain("getMaxCoverCapacity")

    expect(page).toContain("errors.floor.addTableFailed")
    expect(page).toContain("<FloorPlan")

    const prop = page.match(/initialMaxCoverCapacity=\{([^}]+)\}/)?.[1]?.trim()
    expect(prop).toBeTruthy()

    const catchRe = /\bcatch\b/g
    let capacityCatch = ""
    for (const match of page.matchAll(catchRe)) {
      const brace = page.indexOf("{", match.index)
      if (brace < 0) continue
      let blockDepth = 0
      for (let i = brace; i < page.length; i++) {
        if (page[i] === "{") blockDepth += 1
        else if (page[i] === "}") {
          blockDepth -= 1
          if (blockDepth === 0) {
            const block = page.slice(match.index, i + 1)
            if (block.includes("errors.floor.addTableFailed")) {
              capacityCatch = block
            }
            break
          }
        }
      }
    }
    expect(capacityCatch).not.toBe("")
    expect(capacityCatch).toMatch(/\bthrow\b/)

    if (prop !== "null") {
      expect(page).toMatch(
        new RegExp(`\\b${prop}\\b(?:\\s*:[^=]+)?\\s*=\\s*null\\b`),
      )
    }
  })

  it("CC-17 derives the hosted ceiling from the seat sum", () => {
    const sql = read(
      "supabase/migrations/20261005170000_hosted_baseline_columns.sql",
    )

    expect(sql).not.toMatch(/SET\s+max_cover_capacity\s*=\s*38\b/i)
    expect(sql).toMatch(/GREATEST\s*\(\s*38\b/i)
    expect(sql).toMatch(/SUM\s*\(\s*seats\s*\)/i)
    expect(sql).toMatch(
      /SUM\s*\(\s*seats\s*\)[^;]{0,240}?::\s*(?:integer|int)\b/i,
    )
    expect(sql).toMatch(
      /UPDATE\s+restaurant_settings\b[^;]*\bWHERE\s+id\s*=\s*1\s+AND\s+max_cover_capacity\s+IS\s+NULL\b/i,
    )
  })
})
