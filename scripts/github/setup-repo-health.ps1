<#
.SYNOPSIS
  Audit (default) or print apply steps for repo health / rulesets.

.PARAMETER Repo
  owner/name. Defaults to gh repo view.

.PARAMETER Apply
  Prints apply commands; does not silently mutate the remote.
#>
param(
  [string]$Repo = "",
  [switch]$Apply
)

$ErrorActionPreference = "Stop"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "../..")

if (-not $Repo) {
  $Repo = (gh repo view --json nameWithOwner -q .nameWithOwner)
}

Write-Host "repo-health: $Repo"
Write-Host "default branch:" (gh repo view $Repo --json defaultBranchRef -q .defaultBranchRef.name)
Write-Host "rulesets:"
gh api "repos/$Repo/rulesets" --jq '.[].name' 2>$null
if ($LASTEXITCODE -ne 0) {
  Write-Host "  (unable to list rulesets — check auth/permissions)"
}

$configPath = Join-Path $repoRoot ".github/branch-protection-config.json"
if (Test-Path $configPath) {
  Write-Host "config: $configPath"
  Get-Content $configPath | Write-Host
}

if ($Apply) {
  Write-Host ""
  Write-Host "Apply (manual confirmation required):"
  Write-Host "  npm run rulesets:apply -- $Repo"
  Write-Host "  Review .github/branch-protection.md before activating rulesets."
} else {
  Write-Host "Read-only audit complete. Re-run with -Apply to print apply commands."
}
