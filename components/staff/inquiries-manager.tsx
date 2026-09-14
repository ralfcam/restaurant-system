import type { EventInquiryRow } from "@/app/actions/inquiries"

export function InquiriesManager({
  inquiries,
  error,
}: {
  inquiries: EventInquiryRow[]
  error?: string
}) {
  if (error) {
    return (
      <p className="text-sm text-destructive" role="alert">
        {error}
      </p>
    )
  }

  if (inquiries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No open or contacted inquiries.
      </p>
    )
  }

  return (
    <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
      {inquiries.map((inquiry) => (
        <li key={inquiry.id} className="px-5 py-4">
          <p className="font-medium">{inquiry.guest_name}</p>
          <p className="text-sm text-muted-foreground">
            {inquiry.requested_date} · {inquiry.party_size} guests ·{" "}
            {inquiry.status}
          </p>
        </li>
      ))}
    </ul>
  )
}
