# Integration test helpers

Shared utilities for `tests/integration/**/*.integ.test.ts`.

| Module   | Purpose                             |
| -------- | ----------------------------------- |
| `env.ts` | `authEnvReady`, `integrationStrict`; loads `/tmp/local-supabase.env` when keys are unset and the URL is local |

Add route invocation, session cookie forging, and table truncation helpers as
integration coverage grows.
