"use client"

import { type FormEvent, useState, useTransition } from "react"
import { toast } from "sonner"
import { saveReviewEmailSettings } from "@/app/actions/marketing"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

const ENABLED_LABEL_ID = "review-email-enabled-label"

export function ReviewEmailSettingsForm() {
  const [enabled, setEnabled] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const enabledOn = formData.get("enabled") === "on"
    const copy = String(formData.get("copy") ?? "")
    const mapsUrl = String(formData.get("mapsUrl") ?? "")
    const delayHours = Number.parseInt(
      String(formData.get("delayHours") ?? ""),
      10,
    )

    startTransition(async () => {
      const result = await saveReviewEmailSettings({
        enabled: enabledOn,
        copy,
        mapsUrl,
        delayHours,
      })
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success("Review email settings saved.")
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4"
      aria-busy={isPending}
    >
      <div className="flex items-center gap-3">
        <Switch
          checked={enabled}
          onCheckedChange={setEnabled}
          disabled={isPending}
          data-testid="review-email-enabled-control"
          aria-labelledby={ENABLED_LABEL_ID}
        />
        <input type="hidden" name="enabled" value={enabled ? "on" : ""} />
        <Label id={ENABLED_LABEL_ID}>Enable review emails</Label>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="review-email-copy">Thank-you copy</Label>
        <Textarea
          id="review-email-copy"
          name="copy"
          rows={4}
          disabled={isPending}
          data-testid="review-email-copy-control"
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="review-email-maps-url">Google Maps URL</Label>
        <Input
          id="review-email-maps-url"
          name="mapsUrl"
          type="text"
          inputMode="url"
          disabled={isPending}
          data-testid="review-email-maps-url-control"
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="review-email-delay">
          Delay after completed (hours)
        </Label>
        <Input
          id="review-email-delay"
          name="delayHours"
          type="number"
          min={0}
          max={72}
          step={1}
          defaultValue={24}
          disabled={isPending}
          data-testid="review-email-delay-control"
        />
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : "Save"}
      </Button>
    </form>
  )
}
