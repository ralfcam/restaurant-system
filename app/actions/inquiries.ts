"use server"

import {
  validateInquiryPayload,
  type InquiryCreateInput,
} from "@/lib/inquiries/validation"
import { requireStaffUser } from "@/lib/supabase/require-staff"
import { createServiceClient } from "@/lib/supabase/service"

const INQUIRY_STATUSES = ["open", "contacted", "declined", "closed"] as const

export type EventInquiryRow = {
  id: string
  guest_name: string
  email: string | null
  phone: string | null
  requested_date: string
  party_size: number
  kind: "group" | "private_event" | null
  notes: string | null
  status: (typeof INQUIRY_STATUSES)[number]
  created_at: string
  updated_at: string
}

export type InquiryListFilter = {
  status?: "declined" | "closed" | "all"
}

const DEFAULT_LIST_STATUSES = [
  "open",
  "contacted",
] as const satisfies ReadonlyArray<(typeof INQUIRY_STATUSES)[number]>

export async function getEventInquiries(
  filter?: InquiryListFilter,
): Promise<{ inquiries: EventInquiryRow[]; error?: string }> {
  const staffUser = await requireStaffUser()
  if (!staffUser)
    return { inquiries: [], error: "errors.inquiries.unauthorized" }

  const supabase = createServiceClient()
  let query = supabase.from("event_inquiries").select("*")

  const statuses =
    filter?.status === "all"
      ? null
      : filter?.status === "declined" || filter?.status === "closed"
        ? [filter.status]
        : DEFAULT_LIST_STATUSES
  if (statuses) query = query.in("status", statuses)

  const { data, error } = await query
    .order("requested_date")
    .order("created_at")

  if (error) {
    console.error("[inquiries] getEventInquiries:", error.message)
    return { inquiries: [], error: "errors.inquiries.loadFailed" }
  }

  return { inquiries: (data ?? []) as EventInquiryRow[] }
}

export async function createInquiry(
  input: InquiryCreateInput,
): Promise<{ error?: string }> {
  const staffUser = await requireStaffUser()
  if (!staffUser) return { error: "errors.inquiries.unauthorized" }

  const validated = validateInquiryPayload(input ?? {})
  if ("error" in validated) return { error: validated.error }

  const supabase = createServiceClient()
  const { error } = await supabase.from("event_inquiries").insert(validated.row)
  if (error) {
    console.error("[inquiries] createInquiry:", error.message)
    return { error: "errors.inquiries.saveFailed" }
  }
  return {}
}

export async function updateInquiryStatus(
  id: string,
  status: string,
): Promise<{ error?: string }> {
  const staffUser = await requireStaffUser()
  if (!staffUser) return { error: "errors.inquiries.unauthorized" }

  if (!(INQUIRY_STATUSES as readonly string[]).includes(status)) {
    return { error: "errors.inquiries.invalidStatus" }
  }

  const supabase = createServiceClient()
  const { error } = await supabase
    .from("event_inquiries")
    .update({ status })
    .eq("id", id)
  if (error) {
    console.error("[inquiries] updateInquiryStatus:", error.message)
    return { error: "errors.inquiries.updateFailed" }
  }
  return {}
}
