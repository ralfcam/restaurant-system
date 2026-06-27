/** True when anon + service-role keys are present for integration runs. */
export const authEnvReady = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY,
)

export const integrationStrict =
  process.env.RESTAURANT_INTEGRATION_STRICT === "true"
