# Findings run — pr155_toolchain_contradictions

## security

## tech-debt

- [ ] Orchestrator close-out still tells the parent to file findings · `.cursor/commands/sdd-to-tdd.md:1220-1222` · managed Cloud is only "does not auto-confirm"; the main verb is still file, so a managed run that follows this bullet can still create issues · med · (found: tdd/pr155_toolchain_contradictions/C5/refactor)
- [ ] Plan-template findings registration still proposes net-new issues · `.cursor/commands/sdd-to-tdd.md:1494-1504` · the registration bullet still applies the ladder and the cap of 3; managed Cloud only persists and does not auto-confirm · med · (found: tdd/pr155_toolchain_contradictions/C5/refactor)
- [ ] Findings policy still lets STEP 4C create 3 net-new issues · `docs/findings/README.md:59-60` · the per-run cap has no managed attach-only carve-out · med · (found: tdd/pr155_toolchain_contradictions/C5/refactor)

## test-debt

## product-gaps
