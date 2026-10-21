# Branch protection / rulesets

Job names in [`.github/workflows/ci.yml`](./workflows/ci.yml) must match ruleset contexts **exactly**:

- `Architecture invariants`
- `Lint and typecheck`
- `Security gates`
- `Build and test`

## Repository settings (one-time)

**Settings → General → Pull Requests**

| Setting | Value |
| --- | --- |
| Default base branch for pull requests | **`staging`** |
| Automatically delete head branches | **On** |
| Allow update branch | **On** |

## Apply after first push

1. Settings → Rules → New ruleset → Import JSON from `.github/rulesets/staging.json` and `main.json`, set **Active**.
2. Or via helper / API:

```bash
npm run rulesets:apply -- YOUR_ORG/YOUR_REPO
# or:
gh api -X POST repos/YOUR_ORG/YOUR_REPO/rulesets --input .github/rulesets/staging.json
gh api -X POST repos/YOUR_ORG/YOUR_REPO/rulesets --input .github/rulesets/main.json
gh repo edit YOUR_ORG/YOUR_REPO --default-branch staging
```

3. Install Greptile on the org; apply the strict main profile with `npm run rulesets:apply -- OWNER/REPO --with-greptile` when its status check is available.
4. Ensure `@YOUR_ORG/YOUR_TEAM` exists for CODEOWNERS.

## After rulesets are active

Direct pushes to `staging` / `main` are rejected. Ship via `feature/*` → PR → `staging`, then promote `staging` → `main`.

Both branches require all four check names above. Main dismisses stale approvals,
requires approval after the latest push, and requires resolved review threads.
Run `npm run rulesets:check` before applying remote rulesets.

## Optional deploy / continuity checks

See [`branch-protection-config.json`](./branch-protection-config.json). Names like
`Artifact gate` and `Deployment capability` are **optional** until real targets
are wired. Do not add them to required ruleset contexts prematurely.

Manual workflows: `release.yml`, `deploy.yml`, `rollback.yml`, `developer-onboarding.yml`.
Audit live settings with `npm run repo:health`.
