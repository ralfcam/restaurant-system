import { getTranslations } from "next-intl/server"
import type { EventInquiryRow } from "@/app/actions/inquiries"

const INQUIRY_STATUS_KEY = {
  open: "status.inquiry.open",
  contacted: "status.inquiry.contacted",
  declined: "status.inquiry.declined",
  closed: "status.inquiry.closed",
} as const

export async function InquiriesManager({
  inquiries,
  error,
}: {
  inquiries: EventInquiryRow[]
  error?: string
}) {
  const t = await getTranslations()
  if (error) {
    return (
      <p className="text-sm text-destructive" role="alert">
        {t(error)}
      </p>
    )
  }

  if (inquiries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("staff.inquiries.empty")}
      </p>
    )
  }

  return (
    <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
      {inquiries.map((inquiry) => (
        <li key={inquiry.id} className="px-5 py-4">
          <p className="font-medium">{inquiry.guest_name}</p>
          <p className="text-sm text-muted-foreground">
            {inquiry.requested_date} · {inquiry.party_size}{" "}
            {t("staff.inquiries.guests")} ·{" "}
            {t(INQUIRY_STATUS_KEY[inquiry.status])}
          </p>
        </li>
      ))}
    </ul>
  )
}
