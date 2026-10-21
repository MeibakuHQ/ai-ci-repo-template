# Code structure reference

Companion to [SKILL.md](./SKILL.md). Generic path patterns for reviewers and agents.
Replace examples with your real apps and packages.

**Domain glossary:** [`docs/CONTEXT.md`](../../../docs/CONTEXT.md)  
**ADR index:** [`docs/adr/README.md`](../../../docs/adr/README.md)  
**Depth / review workflow:** [architecture-review](../architecture-review/SKILL.md)

## File map (typical)

### Web app (`apps/<web>`)

| Path | Layer |
| --- | --- |
| `app/actions/*.ts` or `src/**/*.controller.ts` | Orchestration |
| `lib/<domain>/service.ts` | App service façade |
| `lib/<domain>/repository.ts` | Persistence port |
| `lib/<domain>/adapters/` | Adapter selection (mock / prod) |
| `components/*` | Presentation only |

### Shared packages (`packages/*`)

| Path | Layer |
| --- | --- |
| `packages/<domain>/src/` | Domain engine, commands, pure rules |
| `packages/types` (or equivalent) | Shared contracts |
| `packages/<ops>/` | Cross-app operational helpers |

### Backend / API (`apps/<api>` or `backend/`)

| Path | Layer |
| --- | --- |
| `*.controller.ts` / route handlers | Orchestration (HTTP) |
| `*.service.ts` | Application service |
| `*.repository.ts` | Persistence |
| Edge / RLS / migrations | Data layer |

## Examples

### Notification (operational)

```ts
// lib/notifications/send.ts — shared mechanics
export async function sendNotification(params: {
  to: string;
  templateId: string;
  variables: Record<string, string>;
}): Promise<{ sent: boolean; error?: string }> {
  // provider.send(...)
}

// orchestration — WHEN to send
if (profile === "PRIORITY") {
  await sendNotification({
    to: user.phone,
    templateId: "priority-check-in",
    variables: { name: user.fullName },
  });
}
```

### Domain write (package + façade + action)

```ts
// packages/<domain> — DomainEngine.execute({ type: "...", ... })

// lib/<domain>/service.ts — app façade
export function executeDomainCommand(command: DomainCommand): CommandResult {
  return getRuntime().engine.execute(command);
}

// app/actions/*.ts — orchestration
export async function submitForm(_prev, formData): Promise<ActionState> {
  const result = executeDomainCommand({
    type: "submit",
    payload: { /* parsed from FormData */ },
  });
  if (!result.ok) return { ok: false, message: result.error };
  revalidatePath("/");
  return { ok: true, message: result.message };
}
```

### Read via repository + service

```ts
export interface SnapshotRepository {
  getSnapshot(): Snapshot;
}

export function getSnapshot(): Snapshot {
  return repository.getSnapshot();
}

// components — presentation only; receive snapshot via props / server component
```

## Decision tree

```text
Is it shared domain / contract truth?
  YES → packages/<domain>, then app façade + orchestration
  NO  ↓
Is it shared across 2+ apps?
  YES → packages/<name>
  NO  ↓
Is the same operational block in 2+ callers in one app?
  YES → lib/<domain>/ helper or extend app service façade
  NO  → keep in orchestration (action, controller, route)
```

## Tests by layer

| Layer | Where to test |
| --- | --- |
| Domain package | `packages/<name>/tests/` or colocated `*.test.ts` |
| App wiring | `apps/<name>/tests/` |
| Architecture gates | `tests/architecture/` (repo root) |
