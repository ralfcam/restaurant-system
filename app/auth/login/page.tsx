"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { UtensilsCrossed, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { RESTAURANT } from "@/lib/data"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      toast.error("Login failed", { description: error.message })
      return
    }
    router.push("/admin")
    router.refresh()
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        {/* Brand mark */}
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <span className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <UtensilsCrossed className="size-6" />
          </span>
          <div>
            <h1 className="font-heading text-2xl font-semibold">{RESTAURANT.name}</h1>
            <p className="text-sm text-muted-foreground">Staff console</p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="mt-1 w-full" disabled={loading}>
              {loading ? (
                <><Loader2 className="size-4 animate-spin" /> Signing in…</>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Staff access only. Contact your manager to request an account.
        </p>
      </div>
    </div>
  )
}
