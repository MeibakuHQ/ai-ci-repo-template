# Second-operator handover

Package for an independent operator to run staging/production without the principal.

## Access checklist

- [ ] GitHub Environment approval rights for `staging` (and `production` when ready)
- [ ] Read access to release manifests and known-good digests
- [ ] Access to the institutional secret store (not Git)
- [ ] Ability to run `npm run onboarding:verify` and `npm run deployment:capability:audit`
- [ ] Contact path for break-glass approver (distinct from requester)

## Documents to read

1. [`deployment.md`](deployment.md)
2. [`continuity.md`](continuity.md)
3. [`external-actions.md`](external-actions.md)
4. [`second-operator-drill-template.md`](second-operator-drill-template.md)

## First drill

File a developer-takeover drill issue. Record digests and workflow run URLs only —
never passwords, tokens, or customer data.
