import { getTranslations } from "next-intl/server"
import { StaffShell } from "@/components/staff/staff-shell"
import { FloorPlan } from "@/components/staff/floor-plan"
import { getAuthUser } from "@/app/actions/auth"
import { isSuperAdminUser } from "@/lib/supabase/is-staff-user"
import {
  getOccupancyDurationMinutes,
  getSafetyBufferMinutes,
  getSlotIntervalMinutes,
} from "@/app/actions/branding"
import { getFloorSnapshot } from "@/app/actions/reservations"
import { getMaxCoverCapacity } from "@/app/actions/operations"
import { getTodayInRestaurantTZ } from "@/lib/timezone"

export const dynamic = "force-dynamic"

export default async function FloorPage() {
  const t = await getTranslations()
  const today = getTodayInRestaurantTZ()
  const [authUser, snapshot, slotInterval, occupancyDuration, safetyBuffer] =
    await Promise.all([
      getAuthUser(),
      getFloorSnapshot(today),
      getSlotIntervalMinutes(),
      getOccupancyDurationMinutes(),
      getSafetyBufferMinutes(),
    ])

  let maxCoverCapacity: number | null = null
  try {
    maxCoverCapacity = await getMaxCoverCapacity()
  } catch (error) {
    if (
      !(error instanceof Error) ||
      error.message !== "errors.floor.addTableFailed"
    ) {
      throw error
    }
  }

  return (
    <StaffShell
      title={t("staff.floor.title")}
      description={t("staff.floor.description")}
      user={{ email: authUser?.email }}
      isSuperAdmin={isSuperAdminUser(authUser)}
    >
      <FloorPlan
        date={today}
        fallbackData={snapshot}
        initialSlotInterval={slotInterval}
        initialOccupancyDuration={occupancyDuration}
        initialSafetyBuffer={safetyBuffer}
        initialMaxCoverCapacity={maxCoverCapacity}
        isSuperAdmin={isSuperAdminUser(authUser)}
      />
    </StaffShell>
  )
}
