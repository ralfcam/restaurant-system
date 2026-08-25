/**
 * Isolation pin for mutating operating-hours coverage (OH-SAVE).
 * Call from tests/runners only — do not gate `createServiceClient`
 * (staff Save against the linked project is valid production).
 */
const LOCAL_SUPABASE_HOSTS: ReadonlySet<string> = new Set([
  "127.0.0.1",
  "localhost",
  "[::1]",
  "::1",
])

function hoursMutationTargetHostname(url?: string): string | null {
  const resolved = url ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!resolved) return null
  try {
    return new URL(resolved).hostname
  } catch {
    return null
  }
}

export function isIsolatedHoursMutationTarget(url?: string): boolean {
  const hostname = hoursMutationTargetHostname(url)
  return hostname !== null && LOCAL_SUPABASE_HOSTS.has(hostname)
}

export function assertIsolatedHoursMutationTarget(url?: string): void {
  if (!isIsolatedHoursMutationTarget(url)) {
    throw new Error(
      "Hours mutation coverage must run against local Supabase (127.0.0.1, localhost, or [::1])",
    )
  }
}
