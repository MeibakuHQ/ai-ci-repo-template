# Deployment

Fail-closed promote → deploy → rollback. Digests only — never mutable tags.

## Flow

1. **Candidate** on `staging` with successful Artifact gate evidence
2. **Release** via [`release.yml`](../../.github/workflows/release.yml) (no rebuild)
3. **Deploy** via [`deploy.yml`](../../.github/workflows/deploy.yml) to `staging` or `production`
4. **Rollback** via [`rollback.yml`](../../.github/workflows/rollback.yml) to a known-good when migration-compatible

State machine: `packages/deployment` (`canTransition` / `transitionDeployment` / `decideRecovery`).

## Config

[`deployment-config.json`](deployment-config.json) names artifact repositories and environments.
Replace `YOUR_ORG` / `YOUR_REPO` before real deploys.

## Capability honesty

[`deployment-capability-register.json`](deployment-capability-register.json) records maturity.
Do not claim `staging-proven` or higher without deployment **and** rollback evidence.

```bash
npm run release:manifest -- --help
npm run deployment:capability:audit
npm run ci:artifact-gate
```

## Break-glass

Time-limited, dual-control, no secret values in the record. Reconcile before expiry.
See `validateBreakGlassRecord` in `packages/deployment`.

## Compose stub

[`deploy/app/compose.production.yml`](../../deploy/app/compose.production.yml) is a placeholder.
Scripts default to validate-and-log until you wire a real target.
