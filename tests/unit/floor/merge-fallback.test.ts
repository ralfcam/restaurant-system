import { describe, expect, it } from "vitest"
import {
  MERGE_EVENT_TYPE,
  activeMergesFromEvents,
  decodeMergeState,
  dissolvedMergeState,
  encodeMergeState,
  isMissingRelationError,
  mergeStateFromTables,
} from "@/lib/floor/merge-fallback"

describe("merge fallback persistence", () => {
  it("round-trips arrangement state and ignores dissolved events", () => {
    const payload = mergeStateFromTables(
      ["t3", "t4"],
      [
        { id: "t3", label: "3", seats: 2 },
        { id: "t4", label: "4", seats: 4 },
      ],
      {
        expectedMinutes: 120,
        expiresAt: "2026-08-18T19:30:00.000Z",
        status: "available",
      },
    )
    expect(payload).toMatchObject({ v: 1, label: "3+4", seats: 6, tableIds: ["t3", "t4"] })
    expect(decodeMergeState(encodeMergeState(payload))).toEqual(payload)
    expect(decodeMergeState("merge:3+4")).toBeNull()

    const active = activeMergesFromEvents([
      {
        entity_id: "m1",
        to_status: "available",
        reason: encodeMergeState(payload),
        created_at: "2026-08-18T18:00:00.000Z",
      },
      {
        entity_id: "m1",
        to_status: "available",
        reason: encodeMergeState(dissolvedMergeState(payload)),
        created_at: "2026-08-18T18:10:00.000Z",
      },
      {
        entity_id: "m2",
        to_status: "available",
        reason: encodeMergeState({ ...payload, tableIds: ["t5", "t6"], label: "5+6" }),
        created_at: "2026-08-18T18:05:00.000Z",
      },
    ])
    expect(active).toEqual([
      expect.objectContaining({ id: "m2", label: "5+6", tableIds: ["t5", "t6"] }),
    ])
  })

  it("uses entity_type table so fallback rows pass status_events_entity_type_check", () => {
    expect(MERGE_EVENT_TYPE).toBe("table")
    expect(MERGE_EVENT_TYPE).not.toBe("table_merge")
  })

  it("detects a missing table_merges relation so drop-to-merge can fall back", () => {
    expect(
      isMissingRelationError({
        code: "PGRST205",
        message: "Could not find the table 'public.table_merges' in the schema cache",
      }),
    ).toBe(true)
    expect(isMissingRelationError({ code: "42P01", message: 'relation "table_merges" does not exist' })).toBe(
      true,
    )
    expect(isMissingRelationError({ message: "invalid input" })).toBe(false)
  })
})
