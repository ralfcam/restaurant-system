# Tests

See [docs/testing/Pyramid-Overview.md](../docs/testing/Pyramid-Overview.md).

```powershell
pnpm test:unit
pnpm test:integration
pnpm test:e2e
```

Integration strict mode:

```powershell
$env:RESTAURANT_INTEGRATION_STRICT = 'true'; pnpm test:integration
```
