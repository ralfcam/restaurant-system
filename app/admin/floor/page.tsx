import { StaffShell } from "@/components/staff/staff-shell"
import { FloorPlan } from "@/components/staff/floor-plan"

export default function FloorPage() {
  return (
    <StaffShell
      title="Floor Plan"
      description="Configure tables, capacity, and live status"
    >
      <FloorPlan />
    </StaffShell>
  )
}
