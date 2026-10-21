# Interface design (after candidate selection)

Use when the user wants alternative interfaces for a chosen deepening. "Design it
twice" — first idea is rarely best. Vocabulary: [LANGUAGE.md](LANGUAGE.md); domain:
[`docs/CONTEXT.md`](../../../docs/CONTEXT.md).

## 1. Frame the problem space

Before sub-agents or detailed design, write for the user:

- Constraints any new interface must satisfy
- Dependencies and category ([DEEPENING.md](DEEPENING.md))
- Rough sketch (not a final proposal) to ground constraints

Show this, then proceed to exploration.

## 2. Explore alternatives

Spawn 3+ parallel explorations (Task tool or sequential passes) with **different** constraints:

1. **Minimize interface** — 1–3 entry points; maximum leverage per entry
2. **Maximize flexibility** — extension points for varied callers
3. **Optimize default caller** — happy path trivial for main workflow
4. **Ports & adapters** (if cross-seam) — production vs test adapters explicit

Each output:

1. Interface (types, methods, invariants, errors)
2. Usage example for primary caller
3. What implementation hides behind the seam
4. Adapter strategy
5. Trade-offs (leverage vs flexibility vs locality)

Use CONTEXT.md terms and LANGUAGE.md architecture terms. Respect
[code-structure](../code-structure/SKILL.md) layers.

## 3. Compare and recommend

Present designs one at a time, then compare by **depth**, **locality**, **seam placement**.

Give an opinionated recommendation or hybrid. Examples:

- Single `runWriteAction(formData, builder)` vs per-form actions
- Widen an existing repository port vs add a coordinator module behind the same service interface

## Always

- Shared contracts live in `packages/*`, not duplicated DTOs across apps
- UI / presentation does not reach storage directly
- Do not invent a port for a single adapter
