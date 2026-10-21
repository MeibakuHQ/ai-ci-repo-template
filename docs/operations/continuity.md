# Continuity

How the product stays operable when the principal developer is absent.

## Roles

| Role | Responsibility |
| --- | --- |
| `role://release-operator` | Promote, deploy, rollback |
| `role://secondary-operator` | Independent drills; takeover when principal is away |
| `role://security` | Secret custody outside Git |

## Registers

- [`continuity-register.json`](continuity-register.json) — custody / operability / blockers
- [`service-catalog.json`](service-catalog.json) — services and readiness URLs
- [`recovery-sequence.json`](recovery-sequence.json) — ordered total-host-loss steps
- [`../governance/drill-catalog.json`](../governance/drill-catalog.json) — drills + evidence types

## Commands

```bash
npm run ops:health
npm run ops:backup          # defaults to --dry-run
npm run ops:restore         # defaults to --dry-run; requires --confirm-empty-targets for real runs
npm run onboarding:verify
```

Score continuity with `@template/governance` (`assessContinuity`). Do not claim
`verified` operability without dated independent evidence.

## Rules

- No secrets, passwords, or private endpoints in Git or drill issues
- AI assistants cannot advance continuity evidence
- Change the register, then run architecture / ops tests
