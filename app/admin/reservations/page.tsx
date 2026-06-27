import { StaffShell } from "@/components/staff/staff-shell"
import { ReservationsManager } from "@/components/staff/reservations-manager"
import { getReservationsByDate } from "@/app/actions/reservations"
import { getAuthUser } from "@/app/actions/auth"
import { getTodayInRestaurantTZ } from "@/lib/timezone"

export const dynamic = "force-dynamic"

export default async function ReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const { date: dateParam } = await searchParams
  // Use the restaurant's local timezone to determine "today" — avoids UTC
  // midnight boundary mismatches when the server runs in a different TZ.
  const today = getTodayInRestaurantTZ()
  const selectedDate = dateParam ?? today

  const [reservations, authUser] = await Promise.all([
    getReservationsByDate(selectedDate),
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
