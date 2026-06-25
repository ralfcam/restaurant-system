import Link from "next/link"
import { ChefHat } from "lucide-react"
import { StaffShell } from "@/components/staff/staff-shell"
import { PosTerminal } from "@/components/staff/pos-terminal"
import { Button } from "@/components/ui/button"

export default function PosPage() {
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
      <PosTerminal />
    </StaffShell>
  )
}
