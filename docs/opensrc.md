# OpenSRC

Optional helper for reading **small** third-party package sources in a global cache.

## Setup (product monorepos)

```bash
npm install opensrc --save-dev
```

Edit [`opensrc/manifest.json`](../opensrc/manifest.json) to list packages you allow agents to fetch. Keep `blocked` entries for Next/React/large frameworks.

```bash
npm run opensrc:fetch
npm run opensrc:path -- zod
```

Template CI does **not** require `opensrc`. Scripts soft-skip when the package is missing.

## Rules

- Prefer `apps/` / `packages/` / `docs/` for first-party behaviour
- Never commit the `~/.opensrc` cache or large clones into the repo
- Do not fetch blocked packages without an explicit user request
