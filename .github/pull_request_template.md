## Summary

<!-- What changed and why (1–3 bullets). -->

-

## Base branch

**Target: `staging`** — feature/fix/chore PRs merge here first. Use the promotion template for `staging` → `main`.

## Test plan

- [ ] `test:architecture` (`npm run` / `pnpm`)
- [ ] `ci:lint`
- [ ] `ci:security`
- [ ] `ci:build` / `ci:test` or targeted workspace tests
- [ ] Manual verification (describe):

## AI review

- [ ] Findings-first review completed (bugs, regressions, missing tests, architecture)
- [ ] Actionable findings fixed or documented as non-actionable
- [ ] Review evidence applies to the current head SHA
- [ ] All review threads are resolved

## Safety

- [ ] No secrets, production credentials, or sensitive customer data in the diff
- [ ] Domain ownership / architecture invariants still hold
- [ ] Tenant, durable-acknowledgement, source-of-truth, and external-authority profiles remain enforced or explicitly not applicable
