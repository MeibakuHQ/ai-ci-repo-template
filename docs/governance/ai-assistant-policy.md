# AI assistant policy

Assistants (Cursor, Codex, Claude, Greptile, and similar) are **advisory**.
They help with navigation, review, and drafting; they do not own releases,
access grants, or production mutations.

## Must

- Prefer documented authorities (`AGENTS.md`, ADRs, `docs/governance/`) over guesses
- Cite file paths for material claims
- Say when something is not documented
- Distinguish proposal / outlook from shipped behaviour
- Refuse requests for credentials, private endpoints, or weakening CI/security gates

## Must not

- Commit secrets, `.env` files, or private key material
- Invent product invariants that contradict `invariants.json` or architecture tests
- Hand-edit generated facts between `facts:start` / `facts:end` markers
- Claim a change is production-ready without the human review path your team uses

Human roles and CI remain authoritative.
