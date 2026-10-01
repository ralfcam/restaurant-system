import { realpathSync } from "node:fs"
import { createRequire } from "node:module"
import { resolve } from "node:path"
import { assertIsolatedHoursMutationTarget } from "@/lib/scheduling/hours-mutation-target"

// pnpm does not hoist @next/env; Next depends on it. Resolve from that install.
const requireFromNext = createRequire(
  realpathSync(resolve("node_modules/next/package.json")),
)
const { loadEnvConfig } = requireFromNext("@next/env") as {
  loadEnvConfig: (dir: string) => void
}

export function assertPlaywrightSupabaseUrlIsLocalOrUnset(url?: string): void {
  const resolved = url ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!resolved) return
  assertIsolatedHoursMutationTarget(resolved)
}

export default async function playwrightGlobalSetup(): Promise<void> {
  loadEnvConfig(process.cwd())
  assertPlaywrightSupabaseUrlIsLocalOrUnset()
}
