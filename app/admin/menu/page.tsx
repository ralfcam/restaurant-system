import { StaffShell } from "@/components/staff/staff-shell"
import { MenuManager } from "@/components/staff/menu-manager"

export default function AdminMenuPage() {
  return (
    <StaffShell
      title="Menu"
      description="Add, edit, and 86 dishes — changes publish to the guest menu instantly"
    >
      <MenuManager />
    </StaffShell>
  )
}
