import { setRequestLocale } from "next-intl/server"
import { getHomepageChefsPicks } from "@/app/actions/menu"
import { HomePageClient } from "@/components/site/home-page-client"

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: "fr" | "en" }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const initialChefsPicks = await getHomepageChefsPicks()

  return <HomePageClient initialChefsPicks={initialChefsPicks} />
}
