type EditorialCopy = {
  restaurant_display_name: string | null
  tagline: string | null
  welcome_title: string | null
  welcome_message: string | null
  closing_message: string | null
}

type OperatingWindowRow = {
  opens_at: string
  closes_at: string
}

type StandaloneReservePageProps = EditorialCopy & {
  show_reservation_phone?: boolean
  phone?: string | null
  address?: string | null
  hero_image_url?: string | null
  operating_windows?: readonly OperatingWindowRow[]
}

const BLOCKS = [
  ["restaurant_display_name", "widget-restaurant-display-name"],
  ["tagline", "widget-tagline"],
  ["welcome_title", "widget-welcome-title"],
  ["welcome_message", "widget-welcome-message"],
  ["closing_message", "widget-closing-message"],
] as const satisfies ReadonlyArray<readonly [keyof EditorialCopy, string]>

function visibleCopy(value: string | null): string | null {
  if (value == null) return null
  const trimmed = value.trim()
  return trimmed.length === 0 ? null : trimmed
}

export function StandaloneReservePage({
  show_reservation_phone = false,
  phone = null,
  address = null,
  hero_image_url = null,
  operating_windows,
  ...copy
}: StandaloneReservePageProps) {
  const phoneText = show_reservation_phone ? visibleCopy(phone) : null
  const heroSrc = visibleCopy(hero_image_url)
  const hours =
    operating_windows
      ?.map((row) => `${row.opens_at} ${row.closes_at}`)
      .join(" ") ?? null

  return (
    <>
      {heroSrc != null ? (
        // Plain <img> keeps the stored URL as src without fill or dimensions.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={heroSrc} alt="" data-testid="widget-hero" />
      ) : null}
      {BLOCKS.map(([key, testId]) => {
        const text = visibleCopy(copy[key])
        if (text == null) return null
        return (
          <p key={testId} data-testid={testId}>
            {text}
          </p>
        )
      })}
      {phoneText != null ? <p data-testid="widget-phone">{phoneText}</p> : null}
      {hours != null ? <p data-testid="widget-hours">{hours}</p> : null}
      {address != null ? <p data-testid="widget-address">{address}</p> : null}
    </>
  )
}
