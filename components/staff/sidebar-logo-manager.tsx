"use client"

import * as React from "react"
import Image from "next/image"
import useSWR from "swr"
import { toast } from "sonner"
import { ImagePlus, Loader2, Trash2, UtensilsCrossed } from "lucide-react"
import { cn } from "@/lib/utils"
import { RESTAURANT } from "@/lib/data"
import { getRestaurantLogoUrl, removeRestaurantLogo, uploadRestaurantLogo } from "@/app/actions/branding"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

const ACCEPTED_TYPES = "image/png,image/jpeg,image/svg+xml,image/webp"

/**
 * Clickable brand mark in the sidebar header — opens a dialog to upload,
 * replace, or remove the restaurant's logo. Visually identical to the
 * previous static brand div, just wrapped in an interactive trigger.
 */
export function SidebarLogoManager() {
  const { data: logoUrl, mutate } = useSWR("restaurant-logo", getRestaurantLogoUrl)
  const [open, setOpen] = React.useState(false)
  const [preview, setPreview] = React.useState<string | null>(null)
  const [file, setFile] = React.useState<File | null>(null)
  const [isSaving, setIsSaving] = React.useState(false)
  const [isRemoving, setIsRemoving] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  function resetPicker() {
    setFile(null)
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) resetPicker()
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.files?.[0]
    console.log("[v0] handleFileChange fired", next?.name, next?.size, next?.type)
    if (!next) return
    if (preview) URL.revokeObjectURL(preview)
    const url = URL.createObjectURL(next)
    console.log("[v0] created blob url", url)
    setFile(next)
    setPreview(url)
  }

  async function handleSave() {
    if (!file) return
    setIsSaving(true)
    const formData = new FormData()
    formData.set("logo", file)
    try {
      const result = await uploadRestaurantLogo(formData)
      if (result.error) {
        toast.error(result.error)
        return
      }
      await mutate(result.logoUrl)
      toast.success("Logo updated")
      resetPicker()
      setOpen(false)
    } catch {
      toast.error("Could not upload the logo. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  async function handleRemove() {
    setIsRemoving(true)
    try {
      const result = await removeRestaurantLogo()
      if (result.error) {
        toast.error(result.error)
        return
      }
      await mutate(null)
      toast.success("Logo removed")
      resetPicker()
    } catch {
      toast.error("Could not remove the logo. Please try again.")
    } finally {
      setIsRemoving(false)
    }
  }

  const activeLogoUrl = logoUrl ?? null

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <button
            type="button"
            className="group flex w-full items-center gap-2 px-5 py-5 text-left transition-colors hover:bg-sidebar-accent/60"
          />
        }
      >
        <span className="relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
          {activeLogoUrl ? (
            <Image
              src={activeLogoUrl}
              alt={`${RESTAURANT.name} logo`}
              fill
              className="object-cover"
              sizes="36px"
            />
          ) : (
            <UtensilsCrossed className="size-5" />
          )}
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
            Upload a square image to represent {RESTAURANT.name} across the staff console. PNG, JPG, SVG, or WEBP, up to 2MB.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-4">
          <span className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-secondary">
            {preview ? (
              <Image src={preview} alt="Logo preview" fill className="object-cover" sizes="64px" />
            ) : activeLogoUrl ? (
              <Image src={activeLogoUrl} alt={`${RESTAURANT.name} logo`} fill className="object-cover" sizes="64px" />
            ) : (
              <UtensilsCrossed className="size-6 text-muted-foreground" />
            )}
          </span>

          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_TYPES}
              onChange={handleFileChange}
              className="sr-only"
              id="logo-upload-input"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="justify-start"
              onClick={() => fileInputRef.current?.click()}
            >
              <ImagePlus className="size-4" />
              {activeLogoUrl ? "Choose a different image" : "Choose an image"}
            </Button>
            {file ? (
              <p className="truncate text-xs text-muted-foreground">{file.name}</p>
            ) : null}
          </div>
        </div>

        <DialogFooter
          className={cn(
            activeLogoUrl && !file ? "sm:justify-between" : undefined,
          )}
        >
          {activeLogoUrl && !file ? (
            <Button
              type="button"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={handleRemove}
              disabled={isRemoving}
            >
              {isRemoving ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              Remove logo
            </Button>
          ) : null}
          <Button type="button" onClick={handleSave} disabled={!file || isSaving}>
            {isSaving ? <Loader2 className="size-4 animate-spin" /> : null}
            Save logo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
