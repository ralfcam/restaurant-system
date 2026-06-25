import { StaffShell } from "@/components/staff/staff-shell"
import { ReservationsManager } from "@/components/staff/reservations-manager"
import { getReservationsForDate } from "@/app/actions/reservations"
import { getAuthUser } from "@/app/actions/auth"

export const dynamic = "force-dynamic"

export default async function ReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const { date: dateParam } = await searchParams
  const today = new Date().toISOString().slice(0, 10)
  const selectedDate = dateParam ?? today

  const [reservations, authUser] = await Promise.all([
    getReservationsForDate(selectedDate),
    getAuthUser(),
  ])

  const formattedDate = new Date(selectedDate + "T00:00:00").toLocaleDateString(
    undefined,
    { weekday: "long", month: "long", day: "numeric" },
  )

  return (
    <StaffShell
      title="Reservations"
      description={formattedDate}
      user={{ email: authUser?.email }}
    >
      <ReservationsManager
        initialReservations={reservations}
        selectedDate={selectedDate}
        today={today}
      />
    </StaffShell>
  )
}
