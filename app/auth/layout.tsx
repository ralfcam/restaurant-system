import type { Metadata } from "next"
import { NextIntlClientProvider } from "next-intl"
import {
  getMessages,
  getTranslations,
  setRequestLocale,
} from "next-intl/server"

export async function generateMetadata(): Promise<Metadata> {
  setRequestLocale("fr")
  const t = await getTranslations("metadata.auth")

  return {
    title: t("title"),
    description: t("description"),
  }
}

export default async function AuthLayout({
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
