"use client"

import * as React from "react"
import { ImagePlus } from "lucide-react"
import { RESTAURANT } from "@/lib/data"
import { useRestaurantLogo } from "@/hooks/use-restaurant-logo"
import { BrandMark } from "@/components/site/brand-mark"
import { RestaurantLogoEditor } from "@/components/staff/restaurant-logo-editor"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

/**
 * Clickable brand slot in the sidebar header — opens a dialog to upload
 * or remove the restaurant's logo.
 */
export function SidebarLogoManager({
  isSuperAdmin,
}: {
  isSuperAdmin: boolean
}) {
  const { logoUrl } = useRestaurantLogo()
  const [open, setOpen] = React.useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button
            type="button"
            className="group flex w-full items-center gap-2 px-5 py-5 text-left transition-colors hover:bg-sidebar-accent/60"
          />
        }
      >
        <span className="relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
          <BrandMark src={logoUrl} size={36} className="rounded-md" />
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="font-heading text-lg font-semibold">
            {RESTAURANT.name}
          </p>
          <p className="text-xs text-sidebar-foreground/60">Staff Console</p>
        </div>
        <ImagePlus className="size-4 shrink-0 text-sidebar-foreground/0 transition-colors group-hover:text-sidebar-foreground/50" />
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Restaurant logo</DialogTitle>
          <DialogDescription>
            Upload a square image to represent {RESTAURANT.name} on the guest
            site and staff console. PNG, JPG, SVG, or WEBP, up to 2MB.
          </DialogDescription>
        </DialogHeader>
        <RestaurantLogoEditor
          onSaved={() => setOpen(false)}
          isSuperAdmin={isSuperAdmin}
        />
      </DialogContent>
    </Dialog>
  )
}
