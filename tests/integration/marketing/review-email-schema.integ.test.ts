import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { createClient } from "@/lib/supabase/client-server"
import { createServiceClient } from "@/lib/supabase/service"
import { assertIsolatedHoursMutationTarget } from "@/lib/scheduling/hours-mutation-target"
import { authEnvReady } from "../helpers/env"

const SETTINGS_ID = 1

const REVIEW_EMAIL_PATCH = {
  id: SETTINGS_ID,
  review_email_enabled: true,
  review_email_copy: "PV-11 thank-you copy",
  review_email_maps_url: "https://maps.google.com/?q=PV11+Schema",
  review_email_delay_hours: 48,
} as const

type SettingsSnapshot = Record<string, unknown>

let priorSettings: SettingsSnapshot | null = null

async function restoreRestaurantSettingsSingleton() {
  if (!priorSettings) return
  const supabase = createServiceClient()
  await supabase.from("restaurant_settings").upsert(priorSettings)
}

describe.skipIf(!authEnvReady)(
  "review-email schema PV-11 settings columns",
  () => {
    beforeEach(async () => {
      assertIsolatedHoursMutationTarget()
      const supabase = createServiceClient()
      const { data, error } = await supabase
        .from("restaurant_settings")
        .select("*")
        .eq("id", SETTINGS_ID)
        .single()
      expect(error).toBeNull()
      priorSettings = (data ?? null) as SettingsSnapshot | null
    })

    afterEach(async () => {
      assertIsolatedHoursMutationTarget()
      await restoreRestaurantSettingsSingleton()
      priorSettings = null
    })

    it("service-role upsert of review_email settings columns persists and reads back", async () => {
      const supabase = createServiceClient()

      const { error: upsertError } = await supabase
        .from("restaurant_settings")
        .upsert(REVIEW_EMAIL_PATCH)
      expect(upsertError).toBeNull()

      const { data, error: selectError } = await supabase
        .from("restaurant_settings")
        .select(
          "review_email_enabled, review_email_copy, review_email_maps_url, review_email_delay_hours",
        )
        .eq("id", SETTINGS_ID)
        .single()

      expect(selectError).toBeNull()
      expect(data).toEqual({
        review_email_enabled: REVIEW_EMAIL_PATCH.review_email_enabled,
        review_email_copy: REVIEW_EMAIL_PATCH.review_email_copy,
        review_email_maps_url: REVIEW_EMAIL_PATCH.review_email_maps_url,
        review_email_delay_hours: REVIEW_EMAIL_PATCH.review_email_delay_hours,
      })
    })
  },
)

function isPermissionError(
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

// Distinct from review-email-pii (2027-08-18 / 19:00) and occupancy-window (2027-06-16).
const SENDS_TEST_DATE = "2027-09-09"
const SENDS_TEST_TIME = "19:00"
const SENDS_GUEST_NAME = "Review Email Sends Guest"
const SENDS_GUEST_PHONE = "555-0912"
const SENDS_GUEST_EMAIL = "pv12-sends@example.com"

async function cleanupSendsTestSlot() {
  const supabase = createServiceClient()
  await supabase
    .from("reservations")
    .delete()
    .eq("date", SENDS_TEST_DATE)
    .eq("time", SENDS_TEST_TIME)
}

describe.skipIf(!authEnvReady)(
  "review-email schema PV-12 send-queue table",
  () => {
    beforeAll(async () => {
      assertIsolatedHoursMutationTarget()
      await cleanupSendsTestSlot()
    })

    afterEach(async () => {
      assertIsolatedHoursMutationTarget()
      await cleanupSendsTestSlot()
    })

    it("review_email_sends accepts a reservation_id insert and denies anon writes", async () => {
      const confCode = `TVL-${Math.floor(1000 + Math.random() * 9000)}`
      const admin = createServiceClient()
      const { data: reservation, error: reservationError } = await admin
        .from("reservations")
        .insert({
          guest_name: SENDS_GUEST_NAME,
          party_size: 2,
          date: SENDS_TEST_DATE,
          time: SENDS_TEST_TIME,
          phone: SENDS_GUEST_PHONE,
          conf_code: confCode,
          email: SENDS_GUEST_EMAIL,
          // PV-6 claim row is for a completed visit; also skips table-fit so
          // this FK setup does not depend on dining-room seed inventory.
          status: "completed",
        })
        .select("id")
        .single()
      expect(reservationError).toBeNull()
      expect(reservation?.id).toEqual(expect.any(String))

      const { data: sendRow, error: sendInsertError } = await admin
        .from("review_email_sends")
        .insert({ reservation_id: reservation!.id })
        .select("reservation_id, sent_at")
        .single()
      expect(sendInsertError).toBeNull()
      expect(sendRow?.sent_at).toBeNull()

      const anon = createClient()
      const { data: listed, error: listError } = await anon
        .from("review_email_sends")
        .select("reservation_id, sent_at")
      expect(listed ?? []).toHaveLength(0)
      expect(isPermissionError(listError)).toBe(true)

      const { data: anonInserted, error: anonInsertError } = await anon
        .from("review_email_sends")
        .insert({ reservation_id: reservation!.id })
        .select("reservation_id")
      expect(anonInserted ?? []).toHaveLength(0)
      expect(isPermissionError(anonInsertError)).toBe(true)
    })
  },
)

const COMPLETED_AT_ISO = "2027-09-09T21:30:00.000Z"
const CLOCK_GUEST_NAME = "Review Email Clock Guest"
const CLOCK_GUEST_PHONE = "555-0913"
const CLOCK_GUEST_EMAIL = "pv13-clock@example.com"

describe.skipIf(!authEnvReady)(
  "review-email schema PV-13 completed_at clock",
  () => {
    beforeAll(async () => {
      assertIsolatedHoursMutationTarget()
      await cleanupSendsTestSlot()
    })

    afterEach(async () => {
      assertIsolatedHoursMutationTarget()
      await cleanupSendsTestSlot()
    })

    it("reservations.completed_at persists a timestamptz on service-role update", async () => {
      const confCode = `TVL-${Math.floor(1000 + Math.random() * 9000)}`
      const admin = createServiceClient()
      const { data: reservation, error: reservationError } = await admin
        .from("reservations")
        .insert({
          guest_name: CLOCK_GUEST_NAME,
          party_size: 2,
          date: SENDS_TEST_DATE,
          time: SENDS_TEST_TIME,
          phone: CLOCK_GUEST_PHONE,
          conf_code: confCode,
          email: CLOCK_GUEST_EMAIL,
          status: "completed",
        })
        .select("id")
        .single()
      expect(reservationError).toBeNull()
      expect(reservation?.id).toEqual(expect.any(String))

      const { error: updateError } = await admin
        .from("reservations")
        .update({ completed_at: COMPLETED_AT_ISO })
        .eq("id", reservation!.id)
      expect(updateError?.code).not.toBe("PGRST204")
      expect(updateError).toBeNull()

      const { data: row, error: selectError } = await admin
        .from("reservations")
        .select("completed_at")
        .eq("id", reservation!.id)
        .single()
      expect(selectError).toBeNull()
      expect(new Date(row!.completed_at as string).toISOString()).toBe(
        COMPLETED_AT_ISO,
      )
    })
  },
)
