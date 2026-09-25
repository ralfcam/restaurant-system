import { getTranslations } from "next-intl/server"
import { StaffShell } from "@/components/staff/staff-shell"
import { ReservationsManager } from "@/components/staff/reservations-manager"
import {
  getReservationOccupancyWindow,
  getReservationsByDate,
} from "@/app/actions/reservations"
import { getAuthUser } from "@/app/actions/auth"
import { isSuperAdminUser } from "@/lib/supabase/is-staff-user"
import { getTodayInRestaurantTZ } from "@/lib/timezone"

export const dynamic = "force-dynamic"

export default async function ReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const t = await getTranslations("staff.reservations")
  const title = t("title")
  const { date: dateParam } = await searchParams
  // Use the restaurant's local timezone to determine "today" — avoids UTC
  // midnight boundary mismatches when the server runs in a different TZ.
  const today = getTodayInRestaurantTZ()
  const selectedDate = dateParam ?? today

  const [{ reservations }, authUser, occupancyWindow] = await Promise.all([
    getReservationsByDate(selectedDate),
    getAuthUser(),
    getReservationOccupancyWindow(),
  ])

  const formattedDate = new Date(selectedDate + "T00:00:00").toLocaleDateString(
    "fr",
    { weekday: "long", month: "long", day: "numeric" },
  )

  return (
    <StaffShell
      title={title}
      description={formattedDate}
      user={{ email: authUser?.email }}
      isSuperAdmin={isSuperAdminUser(authUser)}
    >
      <ReservationsManager
        initialReservations={reservations}
        selectedDate={selectedDate}
        today={today}
        occupancyWindow={occupancyWindow}
      />
    </StaffShell>
  )
}
