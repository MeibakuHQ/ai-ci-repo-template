# Deployment

Fail-closed promote → deploy → rollback. Digests only — never mutable tags.

## Flow

1. **Candidate** on the selected `staging` commit with successful Artifact gate evidence
2. **Release** via [`release.yml`](../../.github/workflows/release.yml), which checks candidate SHA/ref, performs no rebuild, and uploads an immutable release-manifest artifact
3. **Deploy** via [`deploy.yml`](../../.github/workflows/deploy.yml) using the release id and release workflow run id; the adapter must return durable evidence for every capability
4. **Rollback** via [`rollback.yml`](../../.github/workflows/rollback.yml) using current and target release manifests; migration-prefix compatibility is checked before mutation

State machine: `packages/deployment` (`canTransition` / `transitionDeployment` / `decideRecovery`).

## Config

[`deployment-config.json`](deployment-config.json) names artifact repositories and environments.
Replace `YOUR_ORG` / `YOUR_REPO` before real deploys.
Set `deploymentAdapterModule` to a repository module implementing `validate`,
`backup`, `migrate`, `deploy`, `readiness`, `smoke`, and `rollback`. Every method
returns `{ result: "pass" | "fail", evidence: string[] }`; `stub://` evidence is rejected.

Artifact policies default to `kind: "registry"` and require an approved
`repository@sha256:<digest>` reference. Products deployed through external build
authorities may instead use `kind: "external"`, constrain immutable identifiers
with `allowedPrefixes`, and must record the downloaded artifact's SHA-256 digest.

## Capability honesty

[`deployment-capability-register.json`](deployment-capability-register.json) records maturity.
Do not claim `staging-proven` or higher without deployment **and** rollback evidence.

```bash
npm run release:manifest -- --help
npm run deployment:capability:audit
npm run ci:artifact-gate
npm run deploy:simulate -- --release-manifest path/to/release.json --environment staging
```

## Break-glass

Time-limited, dual-control, no secret values in the record. Reconcile before expiry.
See `validateBreakGlassRecord` in `packages/deployment`.

## Fail-closed scaffold

[`deploy/app/compose.production.yml`](../../deploy/app/compose.production.yml) is a placeholder.
Simulation validates without mutation and never emits a successful terminal
state. Deploy and Rollback workflows fail while the adapter is unconfigured,
the capability is below `ci-verified`, or the referenced Actions artifact is
missing or expired. Product operators must preserve release manifests beyond
the configured artifact retention period when long-term rollback is required.
