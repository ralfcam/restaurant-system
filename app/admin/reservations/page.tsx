import { StaffShell } from "@/components/staff/staff-shell"
import { ReservationsManager } from "@/components/staff/reservations-manager"

export default function ReservationsPage() {
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  })

  return (
    <StaffShell title="Reservations" description={today}>
      <ReservationsManager />
    </StaffShell>
  )
}
