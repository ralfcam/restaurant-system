import Link from "next/link"
import { ChefHat } from "lucide-react"
import { getTables } from "@/app/actions/operations"
import { StaffShell } from "@/components/staff/staff-shell"
import { PosTerminal } from "@/components/staff/pos-terminal"
import { Button } from "@/components/ui/button"

export const dynamic = "force-dynamic"

export default async function PosPage() {
  const tables = await getTables()

  return (
    <StaffShell
      title="Point of Sale"
      description="Build an order and fire it to the kitchen"
      actions={
        <Button variant="outline" render={<Link href="/kds" />}>
          <ChefHat className="size-4" /> Open KDS
        </Button>
      }
    >
      <PosTerminal tables={tables} />
    </StaffShell>
  )
}
