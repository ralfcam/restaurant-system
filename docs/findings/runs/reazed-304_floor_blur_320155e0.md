# Findings run — reazed-304_floor_blur_320155e0

## tech-debt

- [ ] innerWidth vs Tailwind `lg` · components/staff/floor-plan.tsx:676 (`selectTable`) and :313 (resize closer) · Both use `window.innerWidth` / `shouldOpenMobileInspector`; classic scrollbars can disagree with CSS `@media (min-width: 1024px)` so the side inspector can show while the helper still opens the Sheet · low · (found: tdd/reazed-304_floor_blur_320155e0/C1/green)
- [ ] lg+ select no longer assigns `false` · components/staff/floor-plan.tsx `selectTable` · C2 `if` + `setMobileInspectorOpen(true)` only; a stale-open Sheet at lg+ stays open until resize closer or `onOpenChange` · low · (found: tdd/reazed-304_floor_blur_320155e0/C2/green)

## product-gaps

- [ ] Selection paths bypass `selectTable` · components/staff/floor-plan.tsx addTable (~427) and upcoming-list Focus table (:1106) · `setSelectedId` only; below-`lg` those paths never open the bottom inspector · low · (found: tdd/reazed-304_floor_blur_320155e0/C1/red)
- [ ] Resize-down does not open the inspector · components/staff/floor-plan.tsx resize effect (~312) · closer only `setMobileInspectorOpen(false)` at lg+; shrinking below lg with a table already selected leaves the bottom Sheet closed until another `selectTable` · low · (found: tdd/reazed-304_floor_blur_320155e0/C2/red)
