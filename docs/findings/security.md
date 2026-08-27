# Security findings (open)

- [ ] anon/authenticated still have TRUNCATE/REFERENCES/TRIGGER/MAINTAIN (Dxtm) on reservations · live relacl anon=aDxtm, authenticated=aDxtm · RES-PRIV revokes SELECT/UPDATE/DELETE only; TRUNCATE bypasses RLS (PostgREST does not expose it) · low · (found: tdd/reazed-308_privileges_be131e14/C1/refactor)
- [ ] anon/authenticated still have TRUNCATE/REFERENCES/TRIGGER/MAINTAIN (Dxtm) on blocked_dates · table ACL after GRANT SELECT + REVOKE INSERT/UPDATE/DELETE · sibling of reservations Dxtm; TRUNCATE bypasses RLS (PostgREST does not expose it) · low · (found: tdd/reazed-308_privileges_be131e14/C2/refactor)
- [ ] anon/authenticated still have TRUNCATE/REFERENCES/TRIGGER/MAINTAIN (Dxtm) on menu_items · table ACL after GRANT SELECT + REVOKE INSERT/UPDATE/DELETE · sibling of reservations/blocked_dates Dxtm; TRUNCATE bypasses RLS (PostgREST does not expose it) · low · (found: tdd/reazed-308_privileges_be131e14/C3/refactor)
