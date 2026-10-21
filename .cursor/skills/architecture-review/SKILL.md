---
name: architecture-review
description: >-
  Review changes for layer violations, privacy leaks, and domain invariant
  breakage. Also find deepening opportunities: shallow modules, seam leakage,
  testability. Use when reviewing a PR/diff, improving architecture, finding
  refactoring opportunities, or making the codebase more AI-navigable.
---

# Architecture review

Two modes: **PR / diff checklist** (fast) and **deepening review** (HTML report).

**Companion skill (placement rules):** [code-structure](../code-structure/SKILL.md) —
use together; do not contradict accepted ADRs.

## PR / diff checklist

When reviewing a PR or local diff:

1. **Tenant / scope isolation** — queries and tokens scoped correctly.
2. **Layering** — no app deep-imports into another app; shared is the only cross-cut domain package.
3. **Secrets** — no `.env`, service-role keys, or private key material in the diff.
4. **Domain invariants** — changes would not fail `test:architecture` or documented AGENTS rules.
5. **Privacy** — UI surfaces do not leak data they must not show.
6. **Resilience** (if applicable) — idempotent writes; graceful degradation when dependencies are unavailable.

**Output:** findings first (bugs, privacy, architecture), then non-blocking nits. Cite file paths.

## Deepening review

Surface architectural friction and propose **deepening opportunities** — refactors
that turn shallow modules into deep ones. Aim: testability, locality, and
AI-navigability.

### Glossary

Use [LANGUAGE.md](LANGUAGE.md) in review prose. Map repo conventions:

| Repo name | Review vocabulary |
| --- | --- |
| `lib/<domain>/service.ts`, Nest `*.service.ts` | App façade **module** at wiring **seam** |
| Application orchestration + repository | Application **module** |
| `*Repository`, `*Store` ports | **Interface** at persistence **seam** |
| In-memory / mock / production implementations | **Adapters** |

Do not rename files to avoid the word "service"; describe role in glossary terms.

### Prerequisites (read first)

1. [`docs/CONTEXT.md`](../../../docs/CONTEXT.md) — domain terms (when present)
2. [`docs/adr/README.md`](../../../docs/adr/README.md) — accepted decisions (when present)
3. [code-structure/SKILL.md](../code-structure/SKILL.md) — layer placement
4. App docs for the area under review

### Process

#### 1. Explore

Use the Task tool with `subagent_type=Explore` (or search directly) on the target
area. Note friction:

- Understanding one concept requires bouncing across many shallow modules
- **Shallow** modules — interface nearly as complex as implementation
- Pure helpers extracted only for tests while bugs live in call order (no **locality**)
- Leakage across **seams** (UI → store, actions → domain validation, policy in repo)
- Untested or hard-to-test surfaces

Apply the **deletion test** ([LANGUAGE.md](LANGUAGE.md)): deleting the module —
does complexity vanish (pass-through) or reappear in N callers (earning its keep)?

Respect **code-structure** layers: do not suggest moving shared domain rules into
app UI or wiring persistence into presentation.

#### 2. Present candidates as HTML report

Write a self-contained HTML file to the OS temp directory (nothing in the repo).

**Temp path (Windows):** `%TEMP%\architecture-review-<timestamp>.html`  
**Temp path (Unix):** `$TMPDIR/architecture-review-<timestamp>.html` or `/tmp/...`

Open for the user when possible (`start` on Windows, `open` on macOS, `xdg-open` on Linux).
Always give the **absolute path**.

Format: [HTML-REPORT.md](HTML-REPORT.md). Use **CONTEXT.md** vocabulary for domain;
**LANGUAGE.md** for architecture.

Per candidate card:

- **Files** — modules involved
- **Problem** — one sentence (friction)
- **Solution** — one sentence (deepening)
- **Wins** — bullets (locality, leverage, tests)
- **Before / After** — side-by-side diagram (Mermaid and/or hand-built)
- **Badge** — `Strong` | `Worth exploring` | `Speculative`
- **ADR callout** (if needed) — contradicts accepted decision but worth reopening

End with **Top recommendation**: which candidate first and why.

**Do not propose final interfaces yet.** After the report, ask: *"Which of these would you like to explore?"*

#### 3. Grilling loop

When the user picks a candidate:

- Walk constraints, seam placement, what sits behind the interface, surviving tests
- New domain term not in CONTEXT.md → offer to add to [`docs/CONTEXT.md`](../../../docs/CONTEXT.md)
- User rejects with a **lasting** reason → offer ADR in `docs/adr/`
  (skip ephemeral "not now" reasons)
- Explore alternative interfaces → [INTERFACE-DESIGN.md](INTERFACE-DESIGN.md)
- Deepening dependency class → [DEEPENING.md](DEEPENING.md)

Implement changes using [code-structure](../code-structure/SKILL.md) migration checklist
(one caller at a time).

## Related

- [LANGUAGE.md](LANGUAGE.md) · [HTML-REPORT.md](HTML-REPORT.md) · [DEEPENING.md](DEEPENING.md) · [INTERFACE-DESIGN.md](INTERFACE-DESIGN.md)
- Adapted from [Matt Pocock improve-codebase-architecture](https://github.com/mattpocock/skills/tree/main/skills/engineering/improve-codebase-architecture) for monorepos
