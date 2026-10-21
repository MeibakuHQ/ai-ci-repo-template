# Generated facts

Projections from authorities named in [`authority-map.json`](authority-map.json).
Regenerate with `npm run docs:facts:generate`. Do not hand-edit marked sections.

## Workspace catalog

<!-- facts:start workspace-catalog -->
_No workspaces declared yet. Add `workspaces` to root `package.json` when you create apps/packages._

| path | name | private |
| --- | --- | --- |
| @meibaku/ai-ci-repo-template | (root package) | true |
<!-- facts:end workspace-catalog -->

## Command catalog

<!-- facts:start command-catalog -->
| script | command |
| --- | --- |
| ci:artifact-gate | node scripts/ci/evaluate-artifact-gate.mjs |
| ci:build | npm run test:architecture |
| ci:lint | node --check scripts/ci/secret-scan.mjs && node --check scripts/ci/audit-critical.mjs && node --check scripts/ci/check-touched-tsdoc.mjs && node --check scripts/ci/evaluate-artifact-gate.mjs && node --check scripts/governance/docs-facts.mjs && node --check scripts/deploy/deploy.mjs && node --check scripts/deploy/capability-audit.mjs && node --check scripts/release/manifest.mjs && node --check scripts/operations/health.mjs && node --check scripts/operations/backup.mjs && node --check scripts/operations/restore.mjs && node --check scripts/dev/doctor.mjs && node --check scripts/dev/onboarding-verify.mjs && node --check scripts/repo-health.mjs && node --check scripts/opensrc-fetch.mjs && node --check scripts/opensrc-path.mjs && node --check packages/deployment/src/index.js && node --check packages/governance/src/index.js && node --check scripts/gh-pr-staging.mjs && node --check scripts/gh-pr-promote.mjs && node --check scripts/gh-ruleset-apply.mjs && npm run test:touched-tsdoc:unit |
| ci:security | npm run scan:secrets |
| ci:test | npm run test:architecture |
| deployment:capability:audit | node scripts/deploy/capability-audit.mjs |
| dev:doctor | node scripts/dev/doctor.mjs |
| docs:facts:check | node scripts/governance/docs-facts.mjs check |
| docs:facts:generate | node scripts/governance/docs-facts.mjs generate |
| onboarding:verify | node scripts/dev/onboarding-verify.mjs |
| opensrc:fetch | node scripts/opensrc-fetch.mjs |
| opensrc:path | node scripts/opensrc-path.mjs |
| ops:backup | node scripts/operations/backup.mjs |
| ops:health | node scripts/operations/health.mjs |
| ops:restore | node scripts/operations/restore.mjs |
| pr:create | node scripts/gh-pr-staging.mjs |
| pr:promote | node scripts/gh-pr-promote.mjs |
| release:manifest | node scripts/release/manifest.mjs |
| repo:health | node scripts/repo-health.mjs |
| rulesets:apply | node scripts/gh-ruleset-apply.mjs |
| scan:secrets | node scripts/ci/secret-scan.mjs |
| test:architecture | node --test tests/architecture/*.test.mjs && node --test packages/deployment/tests/*.test.mjs && node --test packages/governance/tests/*.test.mjs && node scripts/governance/docs-facts.mjs check |
| test:operations | node --test packages/deployment/tests/*.test.mjs && node --test packages/governance/tests/*.test.mjs && npm run deployment:capability:audit |
| test:touched-tsdoc | node scripts/ci/check-touched-tsdoc.mjs |
| test:touched-tsdoc:unit | node --test scripts/ci/check-touched-tsdoc.test.mjs |
<!-- facts:end command-catalog -->
