/**
 * Supabase client initialised with the service role key.
 * Bypasses Row Level Security — for use exclusively in server-side admin
 * actions (`"use server"` files). NEVER import this on the client boundary.
 */
import { createClient as createSupabaseClient } from "@supabase/supabase-js"

export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        // Disable auto-refresh and session persistence — this client is
        // strictly transient within a single server action invocation.
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  )
}
