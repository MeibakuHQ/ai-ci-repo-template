---
name: code-structure
description: >-
  Place code in the correct workspace layer (apps vs packages vs data/API).
  Use when deciding layer placement, extracting duplicates, or refactoring
  across apps and shared packages — orchestration vs domain vs adapters.
---

# Code structure

## Layer model

| Layer | Path pattern | May depend on |
| --- | --- | --- |
| Shared domain | `packages/*` | nothing in `apps/` |
| Apps | `apps/*` | shared packages via package name only |
| Data / edge | `backend/`, `services/`, etc. | DB, edge runtime |

**One sentence:** Orchestration owns app workflow policy; domain packages own
shared truth and rules; app services compose runtime + repositories; operational
services centralize provider/SDK mechanics with explicit inputs and outputs.

```text
Orchestration (per app)     App layer (lib/ or modules/)     Shared packages
├── when / for whom         ├── service façade               ├── domain engine
├── auth & app policy       ├── repository / runtime         │   (packages/*)
├── UI/cache concerns       └── adapter selection            └── operational helpers
├── form → command/DTO           │
└── user-facing errors           ▼
                            Operational services
                            (email, audit, external APIs)
```

### Layer responsibilities

| Layer | Owns | Must not |
| --- | --- | --- |
| **Orchestration** | App workflow, auth checks, form mapping, cache revalidation, user-facing error shape | Domain validation duplicated from packages; direct DB/SDK calls when a façade exists |
| **Domain package** (`packages/*`) | Contract truth, command validation, pure projections, shared enums | React, Next.js, NestJS, app mock seeds |
| **App service façade** (`lib/*/service.ts`, NestJS `*.service.ts`) | Wiring runtime, calling engine/repository, app-facing helpers | Re-implement domain rules already in a package |
| **Repository / store port** | Persistence mechanics, swap implementations | Business policy (“when to allow write”) |
| **Operational service** | Provider/SDK calls, composable capability blocks | Hidden global state; bypassing repository for domain tables |

## Rules

1. **Import domain only via package names** — no relative deep-imports into `packages/` from apps.
2. **No app → app imports** — shared packages are the only cross-app surface.
3. **Secrets and signing keys** — server / edge only; never ship private keys to clients.
4. **UI privacy** — keep sensitive domains (billing, admin, privileged data) out of surfaces that must not show them.

## When to extract

| Repeated across | Extract to |
| --- | --- |
| 2+ callers in one app | `lib/<domain>/` helpers or shared module code |
| 2+ apps | `packages/<name>/` |
| Shared write path | domain command + engine in a package, then expose via app façade |

**Do not extract** when logic is truly domain-specific and used by only one caller,
or you are inventing an abstraction before a second caller exists.

## Where new code goes

Customize for your monorepo:

- Domain types / pure rules → `packages/<shared>/`
- App UI / orchestration → `apps/<name>/`
- Schema / RLS / edge → `backend/` or your data layer

See [reference.md](./reference.md) for generic path examples.

## Designing shared functions

Design as **capability blocks**, not monoliths:

```ts
// Operational — composable; each caller chooses what to use
sendNotification(...)
appendAuditEvent(...)

// App façade — thin wiring
executeDomainCommand(command)
getSnapshot()

// Domain — single command path
DomainEngine.execute(command)
```

Each function should:

- Accept required data as **explicit parameters**
- Return **structured outputs** (e.g. `{ ok, error }`, DTOs)
- Avoid hidden global state; use injected runtime/repository in tests
- Make failure explicit (structured results; do not swallow errors)
- Carry concise docstrings when intent, invariant, fallback, safety, privacy,
  or ownership would otherwise be easy to miss

## Depth checks (before new modules)

**Deletion test.** Imagine deleting the candidate module. If complexity vanishes
with no cost, it was a pass-through (shallow). If complexity reappears across N
callers, it was earning its keep.

**Two adapters = real seam.** One implementation does not justify a port. Two
adapters (in-memory + Postgres) justify a repository or store interface.

**Interface is the test surface.** Callers and tests should cross the same seam.

Vocabulary: [architecture-review/LANGUAGE.md](../architecture-review/LANGUAGE.md).

## Migration checklist

1. Write the flow in orchestration first (clear behaviour)
2. Run the **deletion test** on any proposed new helper or façade
3. Mark repeated operational chunks across callers
4. Extract **only** repeated, non-domain chunks (or promote domain to `packages/`)
5. Replace one caller → verify (typecheck, lint, tests) → migrate remaining callers
6. Keep app policy in orchestration; keep contract rules in domain packages
7. If shared across apps, extract to `packages/` not duplicate `lib/`

## Anti-patterns

| Anti-pattern | Problem |
| --- | --- |
| **God service** | One huge function hides all control flow |
| **Leaky service** | Mutates domain tables without repository/engine |
| **Rules in actions** | Domain validation in server actions instead of packages |
| **UI reaches storage** | Components fetch or mutate store directly |
| **Over-abstraction** | Extracting logic used by only one caller |
| **Wrong package level** | Cross-app logic trapped in one app’s `lib/` |

## Mental model

```text
New feature?
  → Write in orchestration first
  → Repeated ops only?     → Extract operational helper or app façade method
  → Repeated domain rules? → Extend packages/
  → Second app needs it?   → Move to packages/
  → No repetition?         → Keep in orchestration
```

## Related

- Domain glossary: `docs/CONTEXT.md`
- ADR index: `docs/adr/README.md`
- Architecture reviews: [architecture-review](../architecture-review/SKILL.md)
- Path examples: [reference.md](./reference.md)
