import type { Metadata } from "next"
import { NextIntlClientProvider } from "next-intl"
import {
  getMessages,
  getTranslations,
  setRequestLocale,
} from "next-intl/server"

export async function generateMetadata(): Promise<Metadata> {
  setRequestLocale("fr")
  const t = await getTranslations("metadata.pos")

  return {
    title: t("title"),
    description: t("description"),
  }
}

export default async function PosLayout({
  children,
}: {
  children: React.ReactNode
}) {
  setRequestLocale("fr")
  const messages = await getMessages()

  return (
    <NextIntlClientProvider locale="fr" messages={messages}>
      {children}
    </NextIntlClientProvider>
  )
}
