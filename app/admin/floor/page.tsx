import { StaffShell } from "@/components/staff/staff-shell"
import { FloorPlan } from "@/components/staff/floor-plan"
import { getAuthUser } from "@/app/actions/auth"
import { getFloorSnapshot } from "@/app/actions/reservations"
import { getTodayInRestaurantTZ } from "@/lib/timezone"

export const dynamic = "force-dynamic"

export default async function FloorPage() {
  const today = getTodayInRestaurantTZ()
  const [authUser, snapshot] = await Promise.all([
    getAuthUser(),
    getFloorSnapshot(today),
  ])

  return (
    <StaffShell
      title="Floor Plan"
      description="Live dining room — expected turn time, temporary merges, and auto-assign"
      user={{ email: authUser?.email }}
    >
      <FloorPlan date={today} fallbackData={snapshot} />
    </StaffShell>
  )
}
