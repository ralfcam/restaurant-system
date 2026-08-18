"use client"

import Image from "next/image"
import { ImagePlus } from "lucide-react"
import { RESTAURANT } from "@/lib/data"
import { SITE_LOGO } from "@/lib/site-chrome"
import { useRestaurantLogo } from "@/hooks/use-restaurant-logo"
import { RestaurantLogoEditor } from "@/components/staff/restaurant-logo-editor"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import * as React from "react"

/**
 * Clickable brand mark in the sidebar header — opens a dialog to upload,
 * replace, or restore the restaurant's logo.
 */
export function SidebarLogoManager() {
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
          <Image
            src={logoUrl ?? SITE_LOGO.src}
            alt={`${RESTAURANT.name} logo`}
            fill
            className="object-cover"
            sizes="36px"
          />
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="font-heading text-lg font-semibold">{RESTAURANT.name}</p>
          <p className="text-xs text-sidebar-foreground/60">Staff Console</p>
        </div>
        <ImagePlus className="size-4 shrink-0 text-sidebar-foreground/0 transition-colors group-hover:text-sidebar-foreground/50" />
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Restaurant logo</DialogTitle>
          <DialogDescription>
            Upload a square image to represent {RESTAURANT.name} on the guest site
            and staff console. PNG, JPG, SVG, or WEBP, up to 2MB.
          </DialogDescription>
        </DialogHeader>
        <RestaurantLogoEditor onSaved={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}
