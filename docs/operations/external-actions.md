# External actions

Actions that cannot be completed inside this Git repository.

| Action | Owner role | Notes |
| --- | --- | --- |
| Create GHCR repositories / packages permissions | `role://platform-engineer` | Match `deployment-config.json` artifact repos |
| Configure GitHub Environments (`staging`, `production`) + approvers | `role://release-operator` | Required for deploy/rollback workflows |
| Store production secrets in the institutional vault | `role://security` | Never commit `.env` or paste into issues |
| Grant registry pull for deploy runners | `role://platform-engineer` | Digest pulls only |
| DNS / TLS / ingress for production hostnames | institutional ops | Document endpoints without credentials |
| Schedule second-operator drills | `role://secondary-operator` | Use ISSUE_TEMPLATE; no PHI/secrets |

Update this table when your org adds irreversible steps outside Git.
