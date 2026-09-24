import { getTranslations } from "next-intl/server"
import { StaffShell } from "@/components/staff/staff-shell"
import { SchedulingManager } from "@/components/staff/scheduling-manager"
import {
  getAllOperatingWindows,
  getBlockedDatesInRange,
} from "@/app/actions/availability"
import { getAuthUser } from "@/app/actions/auth"
import { isSuperAdminUser } from "@/lib/supabase/is-staff-user"
import { getRestaurantInfoBar } from "@/app/actions/restaurant-info"
import { getSlotIntervalMinutes } from "@/app/actions/branding"
import { getTodayInRestaurantTZ } from "@/lib/timezone"

export const dynamic = "force-dynamic"

export default async function SchedulingPage() {
  const t = await getTranslations()
  const today = getTodayInRestaurantTZ()
  // Fetch blocked dates for a rolling 6-month window
  const sixMonthsOut = new Date(today)
  sixMonthsOut.setMonth(sixMonthsOut.getMonth() + 6)
  const endISO = sixMonthsOut.toISOString().split("T")[0]

  // Fetch the day one year back so staff can see historical blocks too
  const sixMonthsBack = new Date(today)
  sixMonthsBack.setMonth(sixMonthsBack.getMonth() - 6)
  const startISO = sixMonthsBack.toISOString().split("T")[0]

  const [
    operatingWindows,
    blockedDates,
    authUser,
    restaurantInfo,
    slotIntervalMinutes,
  ] = await Promise.all([
    getAllOperatingWindows(),
    getBlockedDatesInRange(startISO, endISO),
    getAuthUser(),
    getRestaurantInfoBar("fr"),
    getSlotIntervalMinutes(),
  ])

  return (
    <StaffShell
      title={t("staff.scheduling.title")}
      description={t("staff.scheduling.description")}
      user={{ email: authUser?.email }}
      isSuperAdmin={isSuperAdminUser(authUser)}
    >
      <SchedulingManager
        initialOperatingWindows={operatingWindows}
        initialBlockedDates={blockedDates}
        initialAddress={restaurantInfo.address}
        initialPhone={restaurantInfo.phone}
        isSuperAdmin={isSuperAdminUser(authUser)}
        slotIntervalMinutes={slotIntervalMinutes}
      />
    </StaffShell>
  )
}
