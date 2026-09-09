# Findings — res-50_locale_mw_session_cookies_a3f1c8e2

## security

- [ ] Staff-path startsWith is segment-unaware · `lib/supabase/proxy.ts:35-36` (`STAFF_PATHS`) · `/administrator` would be treated as `/admin` and redirected by the staff gate; same class as AC-19, different owner (`staff-authorization.md` SA-2) · med · (found: tdd/res-50_locale_mw_session_cookies_a3f1c8e2/planning)

## tech-debt

## test-debt

## product-gaps
