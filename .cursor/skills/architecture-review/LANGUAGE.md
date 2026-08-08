# Architecture review language

Vocabulary for architecture-review suggestions. In review prose, prefer these
terms. In implementation, file names may still use `*Service.ts` per Nest/Next
convention — describe them as **modules at a seam**.

## Terms

**Module**  
Anything with an interface and an implementation. Scale-agnostic: function, class,
package, or slice (`lib/<domain>/service.ts` is a module).

_Avoid in reviews:_ unit, component (unless UI).

**Interface**  
Everything a caller must know: types, invariants, error modes, ordering, config —
not only the TypeScript signature.

_Avoid:_ API, signature (too narrow).

**Implementation**  
Code inside the module. Distinct from **adapter** (role at a seam).

**Depth**  
Leverage at the interface: much behaviour behind a small surface. **Deep** = high
leverage. **Shallow** = interface nearly as complex as the implementation.

**Seam** _(Michael Feathers)_  
Where behaviour can change without editing every caller. Repository ports,
store ports, app façade entrypoints.

_Avoid:_ boundary (DDD overloaded).

**Adapter**  
Concrete implementation at a seam: in-memory test store, production Postgres
adapter, mock provider.

**Leverage**  
What callers get from depth — one interface, N call sites and tests.

**Locality**  
What maintainers get — fixes and knowledge concentrate in one module.

## Typical mapping (do not rename files)

| Repo convention | Say in reviews |
| --- | --- |
| `*.service.ts` (NestJS) | application module at HTTP seam |
| `lib/*/service.ts` | app façade module at wiring seam |
| `*Repository`, `*Store` | interface at persistence seam |
| Server actions / controllers | orchestration modules |

**Operational service** in [code-structure](../code-structure/SKILL.md) = composable
provider module (notifications, audit) — still a **module** here.

## Principles

- **Depth is a property of the interface**, not line count inside.
- **Deletion test.** Delete the module: complexity vanishes → pass-through;
  complexity spreads to N callers → module earned its keep.
- **Interface is the test surface.** Tests cross the same seam as production callers.
- **One adapter = hypothetical seam. Two adapters = real seam.** Do not add ports
  for a single implementation.

## Relationships

- A **module** has one **interface** (what callers/tests see).
- **Depth** is measured against that interface.
- A **seam** is where the interface lives.
- An **adapter** satisfies the interface at the seam.

## Rejected framings

- Depth as lines(interface) / lines(implementation) — rewards padding.
- "Interface" = only `interface` keyword or public methods — too narrow.
- Renaming all `*Service.ts` to satisfy glossary — breaks Nest/team conventions.

## Phrasing examples

- "Write orchestration is shallow — four actions duplicate revalidation."
- "Domain engine module is deep — small `execute` interface, large validation inside."
- "Pricing leaks across the repository seam" (if business rules live in repo impl).
- "Two adapters justify the store seam: in-memory tests, Postgres production."

**Wins bullets:** *locality: bugs concentrate in one module*, *leverage: one interface, N call sites* — not "cleaner code."
