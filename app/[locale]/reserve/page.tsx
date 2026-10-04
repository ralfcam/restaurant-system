import { setRequestLocale } from "next-intl/server"
import { ReservationWidget } from "@/components/site/reservation-widget"
import { StandaloneReservePage } from "@/components/site/standalone-reserve-page"
import { createServiceClient } from "@/lib/supabase/service"

export default async function ReservePage({
  params,
}: {
  params: Promise<{ locale: "fr" | "en" }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  const supabase = createServiceClient()
  const [settingsResult, windowsResult] = await Promise.all([
    supabase
      .from("restaurant_settings")
      .select(
        "restaurant_display_name, tagline, welcome_title, welcome_message, closing_message, show_reservation_phone, phone, address, hero_image_url",
      )
      .eq("id", 1)
      .maybeSingle(),
    supabase.from("operating_windows").select("opens_at, closes_at"),
  ])

  const settings = settingsResult.data
  const trimmedPhone = settings?.phone?.trim() ?? ""
  const widgetPhone =
    settings?.show_reservation_phone === true && trimmedPhone.length > 0
      ? trimmedPhone
      : ""

  return (
    <main
      className="mx-auto max-w-xl md:max-w-2xl"
      data-testid="standalone-reserve"
    >
      <StandaloneReservePage
        restaurant_display_name={settings?.restaurant_display_name ?? null}
        tagline={settings?.tagline ?? null}
        welcome_title={settings?.welcome_title ?? null}
        welcome_message={settings?.welcome_message ?? null}
        closing_message={settings?.closing_message ?? null}
        show_reservation_phone={settings?.show_reservation_phone ?? false}
        phone={settings?.phone ?? null}
        address={settings?.address ?? null}
        hero_image_url={settings?.hero_image_url ?? null}
        operating_windows={windowsResult.data ?? []}
      />
      <ReservationWidget phone={widgetPhone} />
    </main>
  )
}
