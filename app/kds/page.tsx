import Link from "next/link"
import { Receipt } from "lucide-react"
import { getAuthUser } from "@/app/actions/auth"
import { isSuperAdminUser } from "@/lib/supabase/is-staff-user"
import { StaffShell } from "@/components/staff/staff-shell"
import { KdsBoard } from "@/components/staff/kds-board"
import { Button } from "@/components/ui/button"

export const dynamic = "force-dynamic"

export default async function KdsPage() {
  const authUser = await getAuthUser()

  return (
    <StaffShell
      title="Kitchen Display"
      description="Live order tickets · updates in real time"
      isSuperAdmin={isSuperAdminUser(authUser)}
      actions={
        <Button variant="outline" render={<Link href="/pos" />}>
          <Receipt className="size-4" /> Open POS
        </Button>
      }
    >
      <KdsBoard />
    </StaffShell>
  )
}
