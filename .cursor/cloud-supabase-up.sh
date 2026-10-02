#!/bin/sh
# Bring up the local Supabase stack for fail-closed Cloud integration and e2e.
# Source the env file in the same shell before the phase command.
set -eu
npx supabase start
npx supabase db reset --local
mkdir -p supabase/.temp
npx supabase status -o env \
  --override-name api.url=NEXT_PUBLIC_SUPABASE_URL \
  --override-name auth.anon_key=NEXT_PUBLIC_SUPABASE_ANON_KEY \
  --override-name auth.service_role_key=SUPABASE_SERVICE_ROLE_KEY \
  > supabase/.temp/cloud-test.env
for k in NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE_KEY; do
  grep -q "^$k=" supabase/.temp/cloud-test.env || { echo "missing $k" >&2; exit 1; }
done
pnpm exec playwright install chromium
