---
name: opensrc
description: >-
  Read upstream source for small npm dependencies via OpenSRC. Use when debugging
  library internals when types/docs are insufficient. Do NOT fetch next, react,
  or other mega-frameworks unless the user explicitly accepts a large clone.
  Prefer apps/* and packages/* repo source for first-party code.
---

# OpenSRC

Read **small** dependency implementations from the OpenSRC cache (`~/.opensrc/`).
Workspace code under `apps/` and `packages/` is **never** fetched via OpenSRC.

## Install / refresh (product repos)

```bash
npm install opensrc --save-dev   # optional; soft-skipped if missing
npm run opensrc:fetch            # needs Git + network
```

## Decision tree

```text
Need to understand code?
├─ apps/ or packages/ or scripts/     → read repo source (not OpenSRC)
├─ Domain term                        → docs/CONTEXT.md
├─ Next.js / React / large frameworks → BLOCKED — use node_modules docs + official docs
└─ Small libs (zod, jose, …)          → opensrc path (manifest packages only)
```

## Ad hoc

```bash
npm run opensrc:path -- zod
npm run opensrc:fetch
```

See [`docs/opensrc.md`](../../../docs/opensrc.md). Soft-skip when the `opensrc` package is not installed.
