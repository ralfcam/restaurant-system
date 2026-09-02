import { StaffShell } from "@/components/staff/staff-shell"
import { SchedulingManager } from "@/components/staff/scheduling-manager"
import {
  getAllOperatingWindows,
  getBlockedDatesInRange,
} from "@/app/actions/availability"
import { getAuthUser } from "@/app/actions/auth"
import { isSuperAdminUser } from "@/lib/supabase/is-staff-user"
import { getRestaurantInfoBar } from "@/app/actions/restaurant-info"
import { getTodayInRestaurantTZ } from "@/lib/timezone"

export const dynamic = "force-dynamic"

export default async function SchedulingPage() {
  const today = getTodayInRestaurantTZ()
  // Fetch blocked dates for a rolling 6-month window
  const sixMonthsOut = new Date(today)
  sixMonthsOut.setMonth(sixMonthsOut.getMonth() + 6)
  const endISO = sixMonthsOut.toISOString().split("T")[0]

  // Fetch the day one year back so staff can see historical blocks too
  const sixMonthsBack = new Date(today)
  sixMonthsBack.setMonth(sixMonthsBack.getMonth() - 6)
  const startISO = sixMonthsBack.toISOString().split("T")[0]

  const [operatingWindows, blockedDates, authUser, restaurantInfo] =
    await Promise.all([
      getAllOperatingWindows(),
      getBlockedDatesInRange(startISO, endISO),
      getAuthUser(),
      getRestaurantInfoBar(),
    ])

  return (
    <StaffShell
      title="Scheduling"
      description="Configure opening-hour segments and block specific dates"
      user={{ email: authUser?.email }}
      isSuperAdmin={isSuperAdminUser(authUser)}
    >
      <SchedulingManager
        initialOperatingWindows={operatingWindows}
        initialBlockedDates={blockedDates}
        initialAddress={restaurantInfo.address}
        initialPhone={restaurantInfo.phone}
        isSuperAdmin={isSuperAdminUser(authUser)}
      />
    </StaffShell>
  )
}
