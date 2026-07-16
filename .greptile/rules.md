# Greptile review rules

- Prefer findings that would break CI or documented architecture invariants.
- Flag app → app imports and relative deep-imports into `packages/`.
- Flag committed secrets, `.env` files, and private key material.
- Do not demand husky/commitlint; conventional commits are enough.
- Keep comments actionable and file-cited; skip style nits already covered by lint.
