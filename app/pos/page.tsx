import Link from "next/link"
import { ChefHat } from "lucide-react"
import { getTables, getServers } from "@/app/actions/operations"
import { getMenuItems } from "@/app/actions/menu"
import { getAuthUser } from "@/app/actions/auth"
import { isSuperAdminUser } from "@/lib/supabase/is-staff-user"
import { StaffShell } from "@/components/staff/staff-shell"
import { PosTerminal } from "@/components/staff/pos-terminal"
import { Button } from "@/components/ui/button"

export const dynamic = "force-dynamic"

export default async function PosPage() {
  const [tables, servers, menuItems, authUser] = await Promise.all([
    getTables(),
    getServers(),
    getMenuItems(),
    getAuthUser(),
  ])

  return (
    <StaffShell
      title="Point of Sale"
      description="Build an order and fire it to the kitchen"
      isSuperAdmin={isSuperAdminUser(authUser)}
      actions={
        <Button variant="outline" render={<Link href="/kds" />}>
          <ChefHat className="size-4" /> Open KDS
        </Button>
      }
    >
      <PosTerminal tables={tables} servers={servers} items={menuItems} />
    </StaffShell>
  )
}
