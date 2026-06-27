import { authEnvReady, integrationStrict } from "./helpers/env"

if (integrationStrict && !authEnvReady) {
  throw new Error(
    "RESTAURANT_INTEGRATION_STRICT is set but Supabase env is missing " +
      "(NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY)",
  )
}
