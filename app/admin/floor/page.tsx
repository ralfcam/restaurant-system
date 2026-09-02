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
import { getTodayInRestaurantTZ } from "@/lib/timezone"

export const dynamic = "force-dynamic"

export default async function FloorPage() {
  const today = getTodayInRestaurantTZ()
  const [authUser, snapshot, slotInterval, occupancyDuration, safetyBuffer] =
    await Promise.all([
      getAuthUser(),
      getFloorSnapshot(today),
      getSlotIntervalMinutes(),
      getOccupancyDurationMinutes(),
      getSafetyBufferMinutes(),
    ])

  return (
    <StaffShell
      title="Floor Plan"
      description="Live dining room — room layout, expected turn time, temporary merges, and auto-assign"
      user={{ email: authUser?.email }}
      isSuperAdmin={isSuperAdminUser(authUser)}
    >
      <FloorPlan
        date={today}
        fallbackData={snapshot}
        initialSlotInterval={slotInterval}
        initialOccupancyDuration={occupancyDuration}
        initialSafetyBuffer={safetyBuffer}
        isSuperAdmin={isSuperAdminUser(authUser)}
      />
    </StaffShell>
  )
}
