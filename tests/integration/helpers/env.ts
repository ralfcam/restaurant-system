import { existsSync, readFileSync } from "node:fs"
import path from "node:path"

const LOCAL_HOST = /^(127\.0\.0\.1|localhost|\[::1\])$/i

function isLocalSupabaseUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return LOCAL_HOST.test(parsed.hostname)
  } catch {
    return false
  }
}

function parseEnvFile(contents: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const raw of contents.split("\n")) {
    const line = raw.trim()
    if (!line || line.startsWith("#")) continue
    const eq = line.indexOf("=")
    if (eq <= 0) continue
    out[line.slice(0, eq)] = line.slice(eq + 1)
  }
  return out
}

/**
 * Cloud Agent `start` writes well-known local demo keys to these files.
 * Load them only when the process env is unset, and only if the URL is local
 * — never a substitute for `.env.local` (which may point at the linked remote).
 */
function applyLocalSupabaseRuntimeEnv(): void {
  if (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return
  }
  const candidates = [
    "/tmp/local-supabase.env",
    process.env.HOME ? path.join(process.env.HOME, ".local-supabase.env") : "",
  ].filter(Boolean)
  for (const file of candidates) {
    if (!existsSync(file)) continue
    const parsed = parseEnvFile(readFileSync(file, "utf8"))
    const url = parsed.NEXT_PUBLIC_SUPABASE_URL ?? ""
    if (url && !isLocalSupabaseUrl(url)) continue
    for (const [key, value] of Object.entries(parsed)) {
      if (process.env[key] == null || process.env[key] === "") {
        process.env[key] = value
      }
    }
    break
  }
}

applyLocalSupabaseRuntimeEnv()

/** True when anon + service-role keys are present for integration runs. */
export const authEnvReady = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY,
)

export const integrationStrict =
  process.env.RESTAURANT_INTEGRATION_STRICT === "true"
