import { execFile } from "node:child_process"
import { promisify } from "node:util"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createClient } from "@/lib/supabase/client-server"
import { createServiceClient } from "@/lib/supabase/service"
import { normalizeTime } from "@/lib/reservations/operating-hours"
import { assertIsolatedHoursMutationTarget } from "@/lib/scheduling/hours-mutation-target"
import { authEnvReady } from "../helpers/env"

const execFileAsync = promisify(execFile)

const HOURS_DATA_API_GRANT =
  "GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE operating_windows TO anon, authenticated;"
const HOURS_DATA_API_REVOKE =
  "REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE operating_windows FROM anon, authenticated;"
const HOURS_SERVICE_ROLE_GRANT =
  "GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE operating_windows TO service_role;"
const HOURS_SERVICE_ROLE_REVOKE =
  "REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE operating_windows FROM service_role;"

/** Local postgres-owned tables default to Dxtm for anon/authenticated (no arw). */
async function execLocalHoursPrivilegeSql(sql: string) {
  await execFileAsync("docker", [
    "exec",
    "supabase_db_restaurant-system",
    "psql",
    "-U",
    "postgres",
    "-d",
    "postgres",
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    sql,
  ])
}

const MONDAY = 1

const mondaySegments = [
  {
    day_of_week: MONDAY,
    opens_at: "09:00",
    closes_at: "11:00",
    is_closed: false,
    label: "Morning",
    sort_order: 0,
  },
  {
    day_of_week: MONDAY,
    opens_at: "18:00",
    closes_at: "22:00",
    is_closed: false,
    label: "Dinner",
    sort_order: 1,
  },
] as const

const restOfWeek = [0, 2, 3, 4, 5, 6].map((day_of_week) => ({
  day_of_week,
  opens_at: day_of_week === 0 ? "00:00" : "09:00",
  closes_at: day_of_week === 0 ? "00:00" : "22:00",
  is_closed: day_of_week === 0,
  label: null,
  sort_order: 0,
}))

const p_windows = [...mondaySegments, ...restOfWeek]

type SnapshotRow = Record<string, unknown> & { id?: unknown }

function sortedIdKey(rows: SnapshotRow[]): string {
  return rows
    .map((row) => String(row.id ?? ""))
    .sort()
    .join(",")
}

function isHoursWritePermissionError(
  error: { code?: string; message?: string } | null,
): boolean {
  if (!error) return false
  const code = error.code ?? ""
  const message = error.message ?? ""
  return (
    code === "42501" ||
    code === "PGRST301" ||
    /permission denied|row-level security|not authorized|unauthorized|forbidden/i.test(
      message,
    )
  )
}

async function selectAllWindows() {
  const supabase = createServiceClient()
  const { data, error } = await supabase.from("operating_windows").select("*")
  return { supabase, rows: (data ?? []) as SnapshotRow[], error }
}

let snapshot: SnapshotRow[] = []

describe.skipIf(!authEnvReady)("replace_operating_windows (PostgREST)", () => {
  beforeAll(async () => {
    assertIsolatedHoursMutationTarget()
    // Test-only docker GRANT: service_role has no table SELECT after db reset
    // (REAZED-297). Snapshot/restore stay on createServiceClient.
    await execLocalHoursPrivilegeSql(HOURS_SERVICE_ROLE_GRANT)
    const { rows, error } = await selectAllWindows()
    expect(error).toBeNull()
    snapshot = rows
  })

  afterAll(async () => {
    // Restore by TABLE write only — never via replace_operating_windows — so a
    // failing Red cannot leave the linked hours table empty.
    // Insert snapshot first, then delete leftover test ids: a failed insert
    // must not wipe the week (delete-then-insert is not transactional on REST).
    try {
      assertIsolatedHoursMutationTarget()
      const {
        supabase,
        rows: current,
        error: readError,
      } = await selectAllWindows()
      if (readError) {
        throw new Error(
          `operating_windows restore read failed: ${readError.message}`,
        )
      }
      if (
        sortedIdKey(current) === sortedIdKey(snapshot) &&
        current.length === snapshot.length
      ) {
        return
      }

      const snapshotIds = snapshot
        .map((row) => String(row.id ?? ""))
        .filter(Boolean)

      if (snapshot.length > 0) {
        const { error: insertError } = await supabase
          .from("operating_windows")
          .insert(snapshot)
        if (insertError) {
          throw new Error(
            `operating_windows snapshot restore failed: ${insertError.message}`,
          )
        }
      }

      const { error: deleteError } =
        snapshotIds.length > 0
          ? await supabase
              .from("operating_windows")
              .delete()
              .not("id", "in", `(${snapshotIds.join(",")})`)
          : await supabase
              .from("operating_windows")
              .delete()
              .gte("day_of_week", 0)
      if (deleteError) {
        throw new Error(
          `operating_windows snapshot clear failed: ${deleteError.message}`,
        )
      }
    } finally {
      await execLocalHoursPrivilegeSql(HOURS_SERVICE_ROLE_REVOKE)
    }
  })

  it("replace_operating_windows is PostgREST-callable and atomically persists multiple segments per weekday", async () => {
    const supabase = createServiceClient()
    const { error } = await supabase.rpc("replace_operating_windows", {
      p_windows,
    })

    expect(error?.code).not.toBe("PGRST202")
    expect(error?.message ?? "").not.toMatch(/schema cache/i)
    expect(error).toBeNull()

    const { data, error: selectError } = await supabase
      .from("operating_windows")
      .select("day_of_week, opens_at, closes_at, is_closed, label, sort_order")

    expect(selectError).toBeNull()
    const persisted = data ?? []
    expect(persisted).toHaveLength(p_windows.length)

    const remaining = [...persisted]
    for (const segment of p_windows) {
      const matchIndex = remaining.findIndex(
        (row) =>
          row.day_of_week === segment.day_of_week &&
          row.is_closed === segment.is_closed &&
          row.label === segment.label &&
          row.sort_order === segment.sort_order &&
          normalizeTime(String(row.opens_at)) ===
            normalizeTime(segment.opens_at) &&
          normalizeTime(String(row.closes_at)) ===
            normalizeTime(segment.closes_at),
      )
      expect(matchIndex).toBeGreaterThanOrEqual(0)
      remaining.splice(matchIndex, 1)
    }
    expect(remaining).toHaveLength(0)
  })

  describe("OH-PRIV authenticated Data API", () => {
    const email = `oh-priv-${crypto.randomUUID()}@example.com`
    const password = "OhPriv-C1-test-password!"
    let userId: string | undefined

    beforeAll(async () => {
      assertIsolatedHoursMutationTarget()
      // Reproduce the linked-remote Data API surface (SELECT + DML). Local
      // postgres default ACL is Dxtm-only, so FOR ALL is never reached.
      await execLocalHoursPrivilegeSql(HOURS_DATA_API_GRANT)
      const admin = createServiceClient()
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      })
      expect(error).toBeNull()
      userId = data.user?.id
      expect(userId).toBeTruthy()
    })

    afterAll(async () => {
      try {
        if (userId) {
          const { error } =
            await createServiceClient().auth.admin.deleteUser(userId)
          if (error) {
            throw new Error(
              `OH-PRIV test user cleanup failed: ${error.message}`,
            )
          }
        }
      } finally {
        await execLocalHoursPrivilegeSql(HOURS_DATA_API_REVOKE)
      }
    })

    it("authenticated Data API cannot insert, update, or delete operating_windows", async () => {
      assertIsolatedHoursMutationTarget()

      const authed = createClient()
      const { error: signInError } = await authed.auth.signInWithPassword({
        email,
        password,
      })
      expect(signInError).toBeNull()

      const { rows: beforeRows, error: beforeError } = await selectAllWindows()
      expect(beforeError).toBeNull()
      expect(beforeRows.length).toBeGreaterThan(0)

      const insertLabel = "OH-PRIV-C1-insert"
      const { error: insertError } = await authed
        .from("operating_windows")
        .insert({
          day_of_week: MONDAY,
          opens_at: "10:00",
          closes_at: "11:00",
          is_closed: false,
          label: insertLabel,
          sort_order: 99,
        })
      expect(insertError).not.toBeNull()
      expect(isHoursWritePermissionError(insertError)).toBe(true)

      const updateLabel = "OH-PRIV-C1-update"
      const { error: updateError } = await authed
        .from("operating_windows")
        .update({ label: updateLabel })
        .eq("day_of_week", MONDAY)
      // RLS default-deny: UPDATE/DELETE can be silent 0-row no-ops (error null).
      if (updateError) {
        expect(isHoursWritePermissionError(updateError)).toBe(true)
      }

      const sundayId = beforeRows.find(
        (row) => Number(row.day_of_week) === 0,
      )?.id
      expect(sundayId).toBeTruthy()
      const { error: deleteError } = await authed
        .from("operating_windows")
        .delete()
        .eq("id", sundayId)
      if (deleteError) {
        expect(isHoursWritePermissionError(deleteError)).toBe(true)
      }

      const { rows: afterRows, error: afterError } = await selectAllWindows()
      expect(afterError).toBeNull()
      expect(sortedIdKey(afterRows)).toBe(sortedIdKey(beforeRows))
      expect(afterRows.some((row) => row.label === insertLabel)).toBe(false)
      expect(afterRows.some((row) => row.label === updateLabel)).toBe(false)

      const guest = createClient()
      const { data: guestRows, error: guestError } = await guest
        .from("operating_windows")
        .select("id")
      expect(guestError).toBeNull()
      expect(guestRows).not.toBeNull()
      expect(guestRows!.length).toBeGreaterThan(0)
    })
  })
})
