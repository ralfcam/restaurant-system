# Security findings (open)

- [ ] Hidden review-email `enabled` field is not a gated control · `app/admin/marketing/review-email-settings-form.tsx` · SA-10 chrome lists Switch/Textarea/Input/Save; the hidden `enabled` field can still post if someone bypasses disabled widgets (server SA-7/SA-8 still blocks) · low · (found: tdd/ux_staffchrome_pos_batch_9c4a1b/C332-4/red)
- [ ] Review-email `handleSubmit` does not bail when `!isSuperAdmin` · `app/admin/marketing/review-email-settings-form.tsx` · Disabled chrome can be re-enabled in the DOM and still POST; server `requireSuperAdminUser` still rejects · low · (found: tdd/ux_staffchrome_pos_batch_9c4a1b/C332-4/green)
