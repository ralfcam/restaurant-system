import { execFile } from "node:child_process"
import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"
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

type ColumnPrivilegeRow = {
  column: string
  role: string
  insert: boolean
}

type CatalogMatrix = {
  policies: PolicyRow[]
  table_privileges: TablePrivilegeRow[]
  column_privileges: ColumnPrivilegeRow[]
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
  return NONE_TABLE
}

const RESERVATION_COLUMNS = [
  "id",
  "guest_name",
  "party_size",
  "date",
  "time",
  "status",
  "phone",
  "notes",
  "table_label",
  "conf_code",
  "created_at",
  "email",
  "completed_at",
] as const

const GUEST_INSERT_COLUMNS = new Set([
  "guest_name",
  "party_size",
  "date",
  "time",
  "phone",
  "email",
  "notes",
  "conf_code",
])

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
  'column_privileges', (
    SELECT COALESCE(json_agg(json_build_object(
      'column', c.name,
      'role', r.name,
      'insert', has_column_privilege(r.name, 'public.reservations', c.name, 'INSERT')
    ) ORDER BY c.name, r.name), '[]'::json)
    FROM (SELECT unnest(ARRAY[${RESERVATION_COLUMNS.map((c) => `'${c}'`).join(", ")}]) AS name) c
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

const MIGRATIONS_DIR = path.join(process.cwd(), "supabase", "migrations")
const CREATE_VALIDATE =
  "CREATE OR REPLACE FUNCTION validate_reservation_availability()"
const REVOKE_VALIDATE_PUBLIC =
  "REVOKE ALL ON FUNCTION public.validate_reservation_availability() FROM PUBLIC;"
const REVOKE_VALIDATE_GUESTS =
  "REVOKE ALL ON FUNCTION public.validate_reservation_availability() FROM anon, authenticated;"
const GRANT_VALIDATE_EXECUTE =
  /GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+(?:public\.)?validate_reservation_availability\s*\(\s*\)\s+TO\s+(?:PUBLIC|anon|authenticated)/i

type ValidateTriggerAcl = {
  guest_execute_acls: string[]
  anon_execute: boolean
  authenticated_execute: boolean
  prosecdef: boolean | null
  trigger: {
    present: boolean
    enabled: boolean
    before_insert_or_update: boolean
    function: string
  } | null
}

const VALIDATE_TRIGGER_ACL_SQL = `
SELECT json_build_object(
  'guest_execute_acls', (
    SELECT COALESCE(json_agg(x.grantee ORDER BY x.grantee), '[]'::json)
    FROM (
      SELECT DISTINCT COALESCE(r.rolname, 'PUBLIC') AS grantee
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      CROSS JOIN LATERAL aclexplode(
        COALESCE(p.proacl, acldefault('f'::"char", p.proowner))
      ) AS a
      LEFT JOIN pg_roles r ON r.oid = a.grantee
      WHERE n.nspname = 'public'
        AND p.proname = 'validate_reservation_availability'
        AND pg_get_function_identity_arguments(p.oid) = ''
        AND a.privilege_type = 'EXECUTE'
        AND (a.grantee = 0 OR r.rolname IN ('anon', 'authenticated'))
    ) x
  ),
  'anon_execute', has_function_privilege(
    'anon', 'public.validate_reservation_availability()', 'EXECUTE'
  ),
  'authenticated_execute', has_function_privilege(
    'authenticated', 'public.validate_reservation_availability()', 'EXECUTE'
  ),
  'prosecdef', (
    SELECT p.prosecdef
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'validate_reservation_availability'
      AND pg_get_function_identity_arguments(p.oid) = ''
  ),
  'trigger', (
    SELECT json_build_object(
      'present', true,
      'enabled', t.tgenabled <> 'D',
      'before_insert_or_update',
        (t.tgtype & 2) = 2
        AND (t.tgtype & 4) = 4
        AND (t.tgtype & 16) = 16,
      'function', p.proname
    )
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace ns ON ns.oid = c.relnamespace
    JOIN pg_proc p ON p.oid = t.tgfoid
    WHERE ns.nspname = 'public'
      AND c.relname = 'reservations'
      AND t.tgname = 'enforce_booking_rules'
      AND NOT t.tgisinternal
  )
);
`

function stripLeadingSqlNoise(sql: string): string {
  let rest = sql
  for (;;) {
    rest = rest.replace(/^\s+/, "")
    if (rest.startsWith("--")) {
      const newline = rest.indexOf("\n")
      rest = newline === -1 ? "" : rest.slice(newline + 1)
      continue
    }
    return rest
  }
}

function functionBodySuffix(sql: string, fromIndex: number): string | null {
  const asDollar = sql.indexOf("AS $$", fromIndex)
  if (asDollar === -1) return null
  const end = sql.indexOf("$$;", asDollar)
  if (end === -1) return null
  return sql.slice(end + 3)
}

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

      for (const row of catalog.column_privileges) {
        if (row.role === "service_role") continue
        const expectedInsert =
          (row.role === "anon" || row.role === "authenticated") &&
          GUEST_INSERT_COLUMNS.has(row.column)
        if (row.insert !== expectedInsert) {
          violations.push(
            `reservations ${row.role} INSERT ${row.column}: expected ${expectedInsert} got ${row.insert}`,
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

    it("local reset keeps validate_reservation_availability trigger-only and denies guest EXECUTE", async () => {
      const violations: string[] = []
      const migrationNames = readdirSync(MIGRATIONS_DIR)
        .filter((name) => name.endsWith(".sql"))
        .sort()
      const defining: string[] = []

      for (const name of migrationNames) {
        const sql = readFileSync(path.join(MIGRATIONS_DIR, name), "utf8")
        let searchFrom = 0
        while (true) {
          const createAt = sql.indexOf(CREATE_VALIDATE, searchFrom)
          if (createAt === -1) break
          defining.push(name)
          const suffix = functionBodySuffix(sql, createAt)
          if (suffix === null) {
            violations.push(
              `${name}: validate_reservation_availability body is not closed with $$;`,
            )
            break
          }
          let rest = stripLeadingSqlNoise(suffix)
          if (!rest.startsWith(REVOKE_VALIDATE_PUBLIC)) {
            violations.push(
              `${name}: missing ${REVOKE_VALIDATE_PUBLIC} immediately after the function body`,
            )
          } else {
            rest = stripLeadingSqlNoise(
              rest.slice(REVOKE_VALIDATE_PUBLIC.length),
            )
            if (!rest.startsWith(REVOKE_VALIDATE_GUESTS)) {
              violations.push(
                `${name}: missing ${REVOKE_VALIDATE_GUESTS} immediately after PUBLIC revoke`,
              )
            }
          }
          searchFrom = createAt + CREATE_VALIDATE.length
        }
        if (GRANT_VALIDATE_EXECUTE.test(sql)) {
          violations.push(
            `${name}: re-grants guest EXECUTE on validate_reservation_availability()`,
          )
        }
      }

      if (defining.length === 0) {
        violations.push(
          "no migration contains CREATE OR REPLACE FUNCTION validate_reservation_availability()",
        )
      }

      const raw = await execLocalCatalogSql(VALIDATE_TRIGGER_ACL_SQL)
      const catalog = JSON.parse(raw) as ValidateTriggerAcl

      if (catalog.guest_execute_acls.length > 0) {
        violations.push(
          `aclexplode guest/PUBLIC EXECUTE: ${catalog.guest_execute_acls.join(",")}`,
        )
      }
      if (catalog.anon_execute) {
        violations.push("anon has_function_privilege EXECUTE is true")
      }
      if (catalog.authenticated_execute) {
        violations.push("authenticated has_function_privilege EXECUTE is true")
      }
      if (catalog.prosecdef !== true) {
        violations.push(`prosecdef expected true got ${catalog.prosecdef}`)
      }
      if (!catalog.trigger?.present) {
        violations.push("enforce_booking_rules trigger is missing")
      } else {
        if (!catalog.trigger.enabled) {
          violations.push("enforce_booking_rules is disabled")
        }
        if (!catalog.trigger.before_insert_or_update) {
          violations.push(
            "enforce_booking_rules is not BEFORE INSERT OR UPDATE",
          )
        }
        if (catalog.trigger.function !== "validate_reservation_availability") {
          violations.push(
            `enforce_booking_rules points at ${catalog.trigger.function}`,
          )
        }
      }

      expect(violations).toEqual([])
    })
  },
)
