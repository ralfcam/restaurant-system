import { StaffShell } from "@/components/staff/staff-shell"
import { SchedulingManager } from "@/components/staff/scheduling-manager"
import { getAllOperatingWindows } from "@/app/actions/availability"
import { getAuthUser } from "@/app/actions/auth"

export const dynamic = "force-dynamic"

export default async function SchedulingPage() {
  const [operatingWindows, authUser] = await Promise.all([
    getAllOperatingWindows(),
    getAuthUser(),
  ])

  return (
    <StaffShell
      title="Scheduling"
      description="Configure operating hours and block specific dates"
      user={{ email: authUser?.email }}
    >
      <SchedulingManager initialOperatingWindows={operatingWindows} />
    </StaffShell>
  )
}
