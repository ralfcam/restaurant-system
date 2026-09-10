import { execFile } from "node:child_process"
import { promisify } from "node:util"
import { beforeAll, describe, expect, it } from "vitest"
import { assertIsolatedHoursMutationTarget } from "@/lib/scheduling/hours-mutation-target"
import { authEnvReady } from "../helpers/env"

const execFileAsync = promisify(execFile)

const IN_SCOPE_TABLES = [
  "blocked_dates",
  "menu_items",
  "reservations",
  "tables",
  "servers",
  "table_merges",
  "table_merge_members",
  "status_events",
  "orders",
  "order_items",
] as const

const PRIVATE_TABLES = new Set([
  "tables",
  "servers",
  "table_merges",
  "table_merge_members",
  "status_events",
  "orders",
  "order_items",
])

const GUEST_ROLES = ["public", "anon", "authenticated"] as const
const TABLE_PRIVS = [
  "select",
  "insert",
  "update",
  "delete",
  "truncate",
  "references",
  "trigger",
] as const
const SEQUENCE_PRIVS = ["usage", "select", "update"] as const

type TablePriv = (typeof TABLE_PRIVS)[number]
type SequencePriv = (typeof SEQUENCE_PRIVS)[number]
type TableCaps = Record<TablePriv, boolean>
type SequenceCaps = Record<SequencePriv, boolean>

type PolicyRow = {
  table: string
  name: string
  roles: string[]
  cmd: string
}

type TablePrivilegeRow = {
  table: string
  role: string
} & TableCaps

type SequencePrivilegeRow = {
  role: string
} & SequenceCaps

type CatalogMatrix = {
  policies: PolicyRow[]
  table_privileges: TablePrivilegeRow[]
  sequence_privileges: SequencePrivilegeRow[]
  rls: { table: string; enabled: boolean }[]
}

const NONE_TABLE: TableCaps = {
  select: false,
  insert: false,
  update: false,
  delete: false,
  truncate: false,
  references: false,
  trigger: false,
}
const SELECT_ONLY: TableCaps = { ...NONE_TABLE, select: true }
const INSERT_ONLY: TableCaps = { ...NONE_TABLE, insert: true }
const ALL_TABLE: TableCaps = {
  select: true,
  insert: true,
  update: true,
  delete: true,
  truncate: true,
  references: true,
  trigger: true,
}
const NONE_SEQUENCE: SequenceCaps = {
  usage: false,
  select: false,
  update: false,
}
const SERVICE_SEQUENCE: SequenceCaps = {
  usage: true,
  select: true,
  update: false,
}

function guestTableCaps(table: string): TableCaps {
  if (table === "blocked_dates" || table === "menu_items") return SELECT_ONLY
  if (table === "reservations") return INSERT_ONLY
  return NONE_TABLE
}

const CATALOG_SQL = `
SELECT json_build_object(
  'policies', (
    SELECT COALESCE(json_agg(json_build_object(
      'table', p.tablename,
      'name', p.policyname,
      'roles', to_json(p.roles),
      'cmd', p.cmd
    ) ORDER BY p.tablename, p.policyname), '[]'::json)
    FROM pg_policies p
    WHERE p.schemaname = 'public'
      AND p.tablename = ANY(ARRAY[${IN_SCOPE_TABLES.map((t) => `'${t}'`).join(", ")}])
  ),
  'table_privileges', (
    SELECT COALESCE(json_agg(json_build_object(
      'table', t.name,
      'role', r.name,
      'select', has_table_privilege(r.name, format('public.%I', t.name), 'SELECT'),
      'insert', has_table_privilege(r.name, format('public.%I', t.name), 'INSERT'),
      'update', has_table_privilege(r.name, format('public.%I', t.name), 'UPDATE'),
      'delete', has_table_privilege(r.name, format('public.%I', t.name), 'DELETE'),
      'truncate', has_table_privilege(r.name, format('public.%I', t.name), 'TRUNCATE'),
      'references', has_table_privilege(r.name, format('public.%I', t.name), 'REFERENCES'),
      'trigger', has_table_privilege(r.name, format('public.%I', t.name), 'TRIGGER')
    ) ORDER BY t.name, r.name), '[]'::json)
    FROM (SELECT unnest(ARRAY[${IN_SCOPE_TABLES.map((t) => `'${t}'`).join(", ")}]) AS name) t
    CROSS JOIN (
      SELECT unnest(ARRAY['public', 'anon', 'authenticated', 'service_role']) AS name
    ) r
  ),
  'sequence_privileges', (
    SELECT COALESCE(json_agg(json_build_object(
      'role', r.name,
      'usage', has_sequence_privilege(r.name, 'public.orders_order_number_seq', 'USAGE'),
      'select', has_sequence_privilege(r.name, 'public.orders_order_number_seq', 'SELECT'),
      'update', has_sequence_privilege(r.name, 'public.orders_order_number_seq', 'UPDATE')
    ) ORDER BY r.name), '[]'::json)
    FROM (
      SELECT unnest(ARRAY['public', 'anon', 'authenticated', 'service_role']) AS name
    ) r
  ),
  'rls', (
    SELECT COALESCE(json_agg(json_build_object(
      'table', c.relname,
      'enabled', c.relrowsecurity
    ) ORDER BY c.relname), '[]'::json)
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relname = ANY(ARRAY[${IN_SCOPE_TABLES.map((t) => `'${t}'`).join(", ")}])
  )
);
`

async function execLocalCatalogSql(sql: string): Promise<string> {
  const { stdout } = await execFileAsync("docker", [
    "exec",
    "supabase_db_restaurant-system",
    "psql",
    "-U",
    "postgres",
    "-d",
    "postgres",
    "-v",
    "ON_ERROR_STOP=1",
    "-t",
    "-A",
    "-c",
    sql,
  ])
  return stdout.trim()
}

function expectedCaps(role: string, table: string): TableCaps {
  if (role === "service_role") return ALL_TABLE
  if (role === "public") return NONE_TABLE
  return guestTableCaps(table)
}

function capsEqual(actual: TableCaps, expected: TableCaps): boolean {
  return TABLE_PRIVS.every((priv) => actual[priv] === expected[priv])
}

function sequenceEqual(actual: SequenceCaps, expected: SequenceCaps): boolean {
  return SEQUENCE_PRIVS.every((priv) => actual[priv] === expected[priv])
}

describe.skipIf(!authEnvReady)(
  "sibling RLS/ACL matrix after local reset",
  () => {
    beforeAll(() => {
      assertIsolatedHoursMutationTarget()
    })

    it("local reset exposes only the approved sibling role capability matrix", async () => {
      const raw = await execLocalCatalogSql(CATALOG_SQL)
      const catalog = JSON.parse(raw) as CatalogMatrix
      const violations: string[] = []

      for (const table of IN_SCOPE_TABLES) {
        const rls = catalog.rls.find((row) => row.table === table)
        if (!rls?.enabled) {
          violations.push(`${table}: RLS is not enabled`)
        }

        const servicePolicy = catalog.policies.find(
          (policy) =>
            policy.table === table &&
            policy.roles.includes("service_role") &&
            policy.cmd === "ALL",
        )
        if (!servicePolicy) {
          violations.push(`${table}: missing service_role FOR ALL policy`)
        }
      }

      for (const policy of catalog.policies) {
        if (policy.roles.includes("authenticated")) {
          violations.push(
            `${policy.table}: authenticated policy ${policy.name} (${policy.cmd})`,
          )
        }
        if (
          PRIVATE_TABLES.has(policy.table) &&
          policy.roles.some((role) => role === "anon" || role === "public")
        ) {
          violations.push(
            `${policy.table}: guest policy ${policy.name} for ${policy.roles.join(",")}`,
          )
        }
      }

      for (const row of catalog.table_privileges) {
        const expected = expectedCaps(row.role, row.table)
        const actual = {
          select: row.select,
          insert: row.insert,
          update: row.update,
          delete: row.delete,
          truncate: row.truncate,
          references: row.references,
          trigger: row.trigger,
        }
        if (!capsEqual(actual, expected)) {
          violations.push(
            `${row.table} ${row.role}: expected ${JSON.stringify(expected)} got ${JSON.stringify(actual)}`,
          )
        }
      }

      for (const role of [...GUEST_ROLES, "service_role"] as const) {
        const row = catalog.sequence_privileges.find(
          (item) => item.role === role,
        )
        const expected =
          role === "service_role" ? SERVICE_SEQUENCE : NONE_SEQUENCE
        const actual = row
          ? { usage: row.usage, select: row.select, update: row.update }
          : NONE_SEQUENCE
        if (!sequenceEqual(actual, expected)) {
          violations.push(
            `orders_order_number_seq ${role}: expected ${JSON.stringify(expected)} got ${JSON.stringify(actual)}`,
          )
        }
      }

      expect(violations).toEqual([])
    })
  },
)
