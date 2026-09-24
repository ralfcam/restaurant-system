import Link from "next/link"
import { getTranslations } from "next-intl/server"

export default async function AuthErrorPage() {
  const t = await getTranslations("auth")
  const errorTitle = t("errorTitle")
  const errorBody = t("errorBody")
  const backToLogin = t("backToLogin")

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="text-center">
        <h1 className="font-heading text-2xl font-semibold">{errorTitle}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{errorBody}</p>
        <Link
          href="/auth/login"
          className="mt-4 inline-block text-sm text-primary underline underline-offset-4"
        >
          {backToLogin}
        </Link>
      </div>
    </div>
  )
}
