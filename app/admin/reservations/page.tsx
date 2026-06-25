import { StaffShell } from "@/components/staff/staff-shell"
import { ReservationsManager } from "@/components/staff/reservations-manager"
import { getReservationsForDate } from "@/app/actions/reservations"
import { getAuthUser } from "@/app/actions/auth"

export const dynamic = "force-dynamic"

export default async function ReservationsPage() {
  const today = new Date().toISOString().slice(0, 10)
  const [reservations, authUser] = await Promise.all([
    getReservationsForDate(today),
    getAuthUser(),
  ])

  const todayFormatted = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  })

  return (
    <StaffShell title="Reservations" description={todayFormatted} user={{ email: authUser?.email }}>
      <ReservationsManager initialReservations={reservations} />
    </StaffShell>
  )
}
