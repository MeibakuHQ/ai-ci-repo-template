## Promotion: `staging` → `main`

Release promotion PR. Confirm soak on `staging` is complete before merge.

## Release

- **Milestone:** <!-- e.g. v1.0.0 -->
- **Tag after merge:** <!-- e.g. v1.0.0 -->

## Exit criteria

- [ ] `test:architecture` green on `staging`
- [ ] `ci:lint` / `ci:security` green on `staging`
- [ ] CI green on latest `staging` commit
- [ ] Findings-first release review complete; actionable findings resolved
- [ ] Approval was recorded after the latest push
- [ ] All review threads are resolved
- [ ] Record the reviewed head SHA: <!-- full SHA -->

## Summary since last production release

<!-- High-level changelog -->

## Rollback plan

<!-- How to revert if production deploy fails -->
