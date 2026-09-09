// PV-15: pg_cron invokes this function hourly. verify_jwt is off because
// the caller is Vault `cron_secret`, not a user JWT. Same Bearer as the
// Next route (PV-9). Forwards to GET /api/cron/review-email so the mailer
// factory stays the single worker (PV-14).
Deno.serve(async (req) => {
  const secret = Deno.env.get("CRON_SECRET")
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response(null, { status: 401 })
  }

  const appUrl = Deno.env.get("REVIEW_EMAIL_APP_URL")
  if (!appUrl) {
    return new Response("REVIEW_EMAIL_APP_URL is not configured.", {
      status: 503,
    })
  }

  const target = new URL("/api/cron/review-email", appUrl)
  const upstream = await fetch(target, {
    headers: { authorization: `Bearer ${secret}` },
  })
  return new Response(null, { status: upstream.status })
})
