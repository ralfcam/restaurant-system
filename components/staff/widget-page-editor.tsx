"use client"

import type { FormEvent } from "react"
import { useTranslations } from "next-intl"
import { updateStandaloneWidgetCopy } from "@/app/actions/widget-page"

const TEXT_FIELDS = [
  "restaurant_display_name",
  "tagline",
  "welcome_title",
  "welcome_message",
  "closing_message",
] as const

const FIELD_LABEL_KEYS = {
  restaurant_display_name: "staff.branding.restaurantDisplayName",
  tagline: "staff.branding.widgetTagline",
  welcome_title: "staff.branding.welcomeTitle",
  welcome_message: "staff.branding.welcomeMessage",
  closing_message: "staff.branding.closingMessage",
} as const

type WidgetCopy = {
  [Field in (typeof TEXT_FIELDS)[number]]: string | null
} & {
  show_reservation_phone: boolean
}

export function WidgetPageEditor({
  show_reservation_phone,
  ...copy
}: WidgetCopy) {
  const t = useTranslations()

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const text = (name: (typeof TEXT_FIELDS)[number]) =>
      String(data.get(name) ?? "")

    await updateStandaloneWidgetCopy({
      restaurant_display_name: text("restaurant_display_name"),
      tagline: text("tagline"),
      welcome_title: text("welcome_title"),
      welcome_message: text("welcome_message"),
      closing_message: text("closing_message"),
      show_reservation_phone: data.get("show_reservation_phone") === "on",
    })
  }

  return (
    <form data-testid="widget-page-editor" onSubmit={onSubmit}>
      {TEXT_FIELDS.map((name) => (
        <label key={name}>
          {t(FIELD_LABEL_KEYS[name])}
          <input name={name} defaultValue={copy[name] ?? ""} />
        </label>
      ))}
      <label>
        {t("staff.branding.showReservationPhone")}
        <input
          type="checkbox"
          name="show_reservation_phone"
          defaultChecked={show_reservation_phone}
        />
      </label>
      <button type="submit">{t("staff.branding.saveWidgetCopy")}</button>
    </form>
  )
}
