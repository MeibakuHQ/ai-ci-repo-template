#!/usr/bin/env node
/**
 * Cross-platform launcher for repo health audit (read-only by default).
 * On Windows prefers the PowerShell script; elsewhere prints gh checklist.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const apply = process.argv.includes("--apply");
const repo = process.argv.find((a, i, arr) => arr[i - 1] === "--repo") ?? null;

if (process.platform === "win32") {
  const ps1 = path.join(root, "scripts/github/setup-repo-health.ps1");
  const args = ["-NoProfile", "-File", ps1];
  if (repo) args.push("-Repo", repo);
  if (apply) args.push("-Apply");
  const result = spawnSync("powershell.exe", args, { cwd: root, stdio: "inherit" });
  process.exit(result.status ?? 1);
}

console.log("repo-health (non-Windows): audit with gh");
console.log("  gh api repos/{owner}/{repo}/rulesets");
console.log("  gh api repos/{owner}/{repo} --jq .default_branch");
console.log("See .github/branch-protection.md and scripts/github/setup-repo-health.ps1");
if (apply) {
  console.error("--apply is only implemented in the PowerShell helper on Windows");
  process.exit(1);
}
