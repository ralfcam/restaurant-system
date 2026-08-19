"use client"

import * as React from "react"
import Image from "next/image"
import { toast } from "sonner"
import { ImagePlus, Loader2, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useRestaurantHeroImage } from "@/hooks/use-restaurant-hero-image"
import { removeRestaurantHeroImage, uploadRestaurantHeroImage } from "@/app/actions/branding"
import { resolveHeroContentType } from "@/lib/branding"
import { Button } from "@/components/ui/button"

const ACCEPTED_TYPES = "image/png,image/jpeg,image/webp"

/** Reads a File into a base64 string (no data URL prefix) using FileReader. */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.slice(result.indexOf(",") + 1))
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

/**
 * Upload / replace / restore the homepage hero background photo. Used on
 * `/admin/settings`. With no image set, the homepage hero renders a blank
 * background instead of a bundled stock photo.
 */
export function RestaurantHeroImageEditor() {
  const { heroImageUrl, mutate } = useRestaurantHeroImage()
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

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.files?.[0]
    if (!next) return
    if (preview) URL.revokeObjectURL(preview)
    setFile(next)
    setPreview(URL.createObjectURL(next))
  }

  async function handleSave() {
    if (!file) return
    setIsSaving(true)
    try {
      const base64 = await fileToBase64(file)
      const contentType = resolveHeroContentType(file.type, file.name) ?? file.type
      const result = await uploadRestaurantHeroImage({
        base64,
        contentType,
        size: file.size,
        fileName: file.name,
      })
      if (result.error) {
        toast.error(result.error)
        return
      }
      await mutate(result.heroImageUrl)
      toast.success("Hero image updated")
      resetPicker()
    } catch (err) {
      console.error("[branding] hero handleSave:", err)
      toast.error("Could not upload the hero image. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  async function handleRemove() {
    setIsRemoving(true)
    try {
      const result = await removeRestaurantHeroImage()
      if (result.error) {
        toast.error(result.error)
        return
      }
      await mutate(null)
      toast.success("Hero image removed — homepage now shows a blank background")
      resetPicker()
    } catch {
      toast.error("Could not remove the hero image. Please try again.")
    } finally {
      setIsRemoving(false)
    }
  }

  const displaySrc = preview ?? heroImageUrl
  const hasCustomHero = Boolean(heroImageUrl) && !preview

  return (
    <div className="flex flex-col gap-4">
      <span className="relative flex aspect-[16/9] w-full items-center justify-center overflow-hidden rounded-md border border-border bg-secondary">
        {preview ? (
          // Local blob: URL from the file picker — a plain <img> avoids
          // next/image's optimization pipeline, which isn't meant for
          // ephemeral object URLs.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Hero image preview" className="size-full object-cover" />
        ) : displaySrc ? (
          <Image
            src={displaySrc}
            alt="Homepage hero background preview"
            fill
            className="object-cover"
            sizes="(min-width: 640px) 512px, 100vw"
          />
        ) : (
          <span className="px-4 text-center text-xs text-muted-foreground">
            No hero image set — homepage shows a blank background
          </span>
        )}
      </span>

      <div className="flex flex-col gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          onChange={handleFileChange}
          className="sr-only"
          id="hero-image-upload-input"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="justify-start"
          onClick={() => fileInputRef.current?.click()}
        >
          <ImagePlus className="size-4" />
          {heroImageUrl ? "Choose a different image" : "Choose an image"}
        </Button>
        {file ? <p className="truncate text-xs text-muted-foreground">{file.name}</p> : null}
      </div>

      <div
        className={cn(
          "flex flex-col-reverse gap-2 sm:flex-row sm:items-center",
          hasCustomHero && !file ? "sm:justify-between" : "sm:justify-end",
        )}
      >
        {hasCustomHero && !file ? (
          <Button
            type="button"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={handleRemove}
            disabled={isRemoving}
          >
            {isRemoving ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            Remove hero image
          </Button>
        ) : null}
        <Button type="button" onClick={handleSave} disabled={!file || isSaving}>
          {isSaving ? <Loader2 className="size-4 animate-spin" /> : null}
          Save hero image
        </Button>
      </div>
    </div>
  )
}
