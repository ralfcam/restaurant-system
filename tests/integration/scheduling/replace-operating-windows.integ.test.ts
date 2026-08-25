import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createServiceClient } from "@/lib/supabase/service"
import { normalizeTime } from "@/lib/reservations/operating-hours"
import { authEnvReady } from "../helpers/env"

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

async function selectAllWindows() {
  const supabase = createServiceClient()
  const { data, error } = await supabase.from("operating_windows").select("*")
  return { supabase, rows: (data ?? []) as SnapshotRow[], error }
}

let snapshot: SnapshotRow[] = []

describe.skipIf(!authEnvReady)("replace_operating_windows (PostgREST)", () => {
  beforeAll(async () => {
    const { rows, error } = await selectAllWindows()
    expect(error).toBeNull()
    snapshot = rows
  })

  afterAll(async () => {
    // Restore by TABLE write only — never via replace_operating_windows — so a
    // failing Red cannot leave the linked hours table empty.
    // Insert snapshot first, then delete leftover test ids: a failed insert
    // must not wipe the week (delete-then-insert is not transactional on REST).
    const { supabase, rows: current, error: readError } = await selectAllWindows()
    if (readError) {
      throw new Error(`operating_windows restore read failed: ${readError.message}`)
    }
    if (sortedIdKey(current) === sortedIdKey(snapshot) && current.length === snapshot.length) {
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
        throw new Error(`operating_windows snapshot restore failed: ${insertError.message}`)
      }
    }

    const { error: deleteError } =
      snapshotIds.length > 0
        ? await supabase
            .from("operating_windows")
            .delete()
            .not("id", "in", `(${snapshotIds.join(",")})`)
        : await supabase.from("operating_windows").delete().gte("day_of_week", 0)
    if (deleteError) {
      throw new Error(`operating_windows snapshot clear failed: ${deleteError.message}`)
    }
  })

  it("replace_operating_windows is PostgREST-callable and atomically persists multiple segments per weekday", async () => {
    const supabase = createServiceClient()
    const { error } = await supabase.rpc("replace_operating_windows", { p_windows })

    expect(error?.code).not.toBe("PGRST202")
    expect(error?.message ?? "").not.toMatch(/schema cache/i)
    expect(error).toBeNull()

    const { data, error: selectError } = await supabase
      .from("operating_windows")
      .select("day_of_week, opens_at, closes_at, is_closed, label, sort_order")
      .eq("day_of_week", MONDAY)
      .eq("is_closed", false)

    expect(selectError).toBeNull()
    const mondayOpen = data ?? []
    expect(mondayOpen.length).toBeGreaterThanOrEqual(2)

    for (const segment of mondaySegments) {
      const match = mondayOpen.find(
        (row) =>
          row.label === segment.label &&
          row.sort_order === segment.sort_order &&
          normalizeTime(String(row.opens_at)) === segment.opens_at &&
          normalizeTime(String(row.closes_at)) === segment.closes_at,
      )
      expect(match).toBeTruthy()
    }
  })
})
