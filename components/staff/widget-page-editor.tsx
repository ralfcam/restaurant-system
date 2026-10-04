"use client"

import type { FormEvent } from "react"
import { updateStandaloneWidgetCopy } from "@/app/actions/widget-page"

const TEXT_FIELDS = [
  "restaurant_display_name",
  "tagline",
  "welcome_title",
  "welcome_message",
  "closing_message",
] as const

export function WidgetPageEditor() {
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
          {name}
          <input name={name} />
        </label>
      ))}
      <label>
        show_reservation_phone
        <input type="checkbox" name="show_reservation_phone" />
      </label>
      <button type="submit">Save</button>
    </form>
  )
}
