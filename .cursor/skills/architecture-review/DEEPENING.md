# Deepening

How to deepen shallow modules safely. Vocabulary: [LANGUAGE.md](LANGUAGE.md).
Placement after deepening: [code-structure](../code-structure/SKILL.md).

## Dependency categories

Classify dependencies before deepening:

### 1. In-process

Pure computation, no I/O. Safe to merge modules; test through the new interface directly.

_Example:_ pure projection helpers inside a domain package (keep deep — do not split for tests only).

### 2. Local-substitutable

Local stand-ins exist (in-memory store, PGlite, mock directory). Deepen with stand-in
in tests; seam may stay internal.

_Example:_ `InMemoryStore` + production adapter — real external seam at the store port.

### 3. Remote but owned (ports & adapters)

Internal APIs across network. Port at seam; HTTP adapter prod, in-memory adapter tests.

_Example:_ web app → backend API — port at client boundary if deepening the client module.

### 4. True external (mock)

Stripe, Twilio, IdP admin APIs, etc. Injected port; mock adapter in tests.

## Seam discipline

- **One adapter = hypothetical seam. Two adapters = real seam.**
- Do not expose internal test-only seams through the public interface.
- Do not add a second write path when deepening — deepen orchestration, not duplicate the engine.
- Respect accepted ADRs: deepen behind intentional seams, not around them.

## Testing: replace, don't layer

- After tests exist at the deep module's interface, delete redundant shallow tests.
- Assert observable outcomes through the interface.
- Tests that break on internal refactors are testing past the interface.

## Layer guardrails

| Deepen | Do not |
| --- | --- |
| Orchestration helpers (actions, controllers) | Move shared domain validation into UI |
| App façade entrypoints | Bypass domain engine / package for writes |
| Repository implementations | Put business policy only in orchestration |
| `packages/*` internals | Import React or app mocks into shared domain |

## Recommendation shapes

- *"Collapse four shallow action modules into one orchestration module; engine interface unchanged."*
- *"Define store port with in-memory + production adapters; domain module stays deep."*
- *"Delete pass-through wrapper — deletion test shows zero leverage."*
