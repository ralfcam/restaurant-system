"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Loader2, AlertCircle } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { isStaffUser } from "@/lib/supabase/is-staff-user"
import { RESTAURANT } from "@/lib/data"
import { useRestaurantLogo } from "@/hooks/use-restaurant-logo"
import { BrandMark } from "@/components/site/brand-mark"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function LoginPage() {
  const t = useTranslations("auth")
  const staffConsole = t("staffConsole")
  const emailLabel = t("email")
  const emailPlaceholder = t("emailPlaceholder")
  const passwordLabel = t("password")
  const signingIn = t("signingIn")
  const signIn = t("signIn")
  const staffAccessOnly = t("staffAccessOnly")
  const invalidCredentials = t("invalidCredentials")
  const unauthorized = t("unauthorized")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const { logoUrl } = useRestaurantLogo()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg(null)
    setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    setLoading(false)
    if (error) {
      setErrorMsg(invalidCredentials)
      return
    }
    if (!isStaffUser(data.user)) {
      setErrorMsg(unauthorized)
      return
    }
    // Full page navigation so the middleware session cookie is read correctly.
    window.location.href = "/admin"
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        {/* Brand mark */}
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <BrandMark src={logoUrl} className="rounded-xl" />
          <div>
            <h1 className="font-heading text-2xl font-semibold">
              {RESTAURANT.name}
            </h1>
            <p className="text-sm text-muted-foreground">{staffConsole}</p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {errorMsg && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 px-3.5 py-3 text-sm text-destructive"
              >
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
            <div className="grid gap-1.5">
              <Label htmlFor="email">{emailLabel}</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setErrorMsg(null)
                }}
                placeholder={emailPlaceholder}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="password">{passwordLabel}</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setErrorMsg(null)
                }}
              />
            </div>
            <Button type="submit" className="mt-1 w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> {signingIn}
                </>
              ) : (
                signIn
              )}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          {staffAccessOnly}
        </p>
      </div>
    </div>
  )
}
