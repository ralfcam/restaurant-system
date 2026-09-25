"use client"

import { type FormEvent, useState, useTransition } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { saveReviewEmailSettings } from "@/app/actions/marketing"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

const ENABLED_LABEL_ID = "review-email-enabled-label"

export function ReviewEmailSettingsForm({
  isSuperAdmin,
}: {
  isSuperAdmin: boolean
}) {
  const t = useTranslations()
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
        toast.error(t(result.error))
        return
      }
      toast.success(t("staff.marketing.settingsSaved"))
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
          disabled={isPending || !isSuperAdmin}
          data-testid="review-email-enabled-control"
          aria-labelledby={ENABLED_LABEL_ID}
        />
        <input type="hidden" name="enabled" value={enabled ? "on" : ""} />
        <Label id={ENABLED_LABEL_ID}>
          {t("staff.marketing.enableReviewEmails")}
        </Label>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="review-email-copy">
          {t("staff.marketing.thankYouCopy")}
        </Label>
        <Textarea
          id="review-email-copy"
          name="copy"
          rows={4}
          disabled={isPending || !isSuperAdmin}
          data-testid="review-email-copy-control"
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="review-email-maps-url">
          {t("staff.marketing.mapsUrl")}
        </Label>
        <Input
          id="review-email-maps-url"
          name="mapsUrl"
          type="text"
          inputMode="url"
          disabled={isPending || !isSuperAdmin}
          data-testid="review-email-maps-url-control"
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="review-email-delay">
          {t("staff.marketing.delayHours")}
        </Label>
        <Input
          id="review-email-delay"
          name="delayHours"
          type="number"
          min={0}
          max={72}
          step={1}
          defaultValue={24}
          disabled={isPending || !isSuperAdmin}
          data-testid="review-email-delay-control"
        />
      </div>
      <Button type="submit" disabled={isPending || !isSuperAdmin}>
        {isPending
          ? t("staff.marketing.saving")
          : t("staff.marketing.saveSettings")}
      </Button>
    </form>
  )
}
