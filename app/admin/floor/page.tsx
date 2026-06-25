import { StaffShell } from "@/components/staff/staff-shell"
import { FloorPlan } from "@/components/staff/floor-plan"
import { getAuthUser } from "@/app/actions/auth"

export default async function FloorPage() {
  const authUser = await getAuthUser()

  return (
    <StaffShell
      title="Floor Plan"
      description="Configure tables, capacity, and live status"
      user={{ email: authUser?.email }}
    >
      <FloorPlan />
    </StaffShell>
  )
}
