# Greptile review rules

- Prefer findings that would break CI or documented architecture invariants.
- Flag app → app imports and relative deep-imports into `packages/`.
- Flag committed secrets, `.env` files, and private key material.
- Flag missing TSDoc on new/changed exported declarations (see AGENTS.md / `test:touched-tsdoc`).
- Flag mutable image tags in deploy/release paths; digests only.
- Do not hand-edit `facts:start` / `facts:end` sections; point authors to `docs:facts:generate` and [`docs/governance/authority-map.json`](../docs/governance/authority-map.json).
- Reject secrets in continuity drill issues or ops docs.
- Do not demand husky/commitlint; conventional commits are enough.
- Keep comments actionable and file-cited; skip style nits already covered by lint.
