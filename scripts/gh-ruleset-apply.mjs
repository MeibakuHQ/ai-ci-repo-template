#!/usr/bin/env node
/**
 * Apply .github/rulesets/{staging,main}.json to a GitHub repo via the Rulesets API.
 *
 * Usage:
 *   node scripts/gh-ruleset-apply.mjs YOUR_ORG/YOUR_REPO
 *   npm run rulesets:apply -- YOUR_ORG/YOUR_REPO
 *
 * Requires: gh auth with admin:repo (or repo admin) scope.
 * Tip: apply BEFORE making rulesets the only way to push, or keep a feature
 * branch workflow ready — active rulesets block direct pushes to staging/main.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const repo = process.argv[2];
if (!repo || !repo.includes("/")) {
  console.error("Usage: node scripts/gh-ruleset-apply.mjs OWNER/REPO");
  process.exit(1);
}

const files = ["staging.json", "main.json"];
const dir = join(process.cwd(), ".github", "rulesets");

for (const file of files) {
  const path = join(dir, file);
  if (!existsSync(path)) {
    console.error(`Missing ${path}`);
    process.exit(1);
  }
  console.log(`Applying ${file} → ${repo} …`);
  const result = spawnSync(
    "gh",
    ["api", "-X", "POST", `repos/${repo}/rulesets`, "--input", path],
    { stdio: "inherit", shell: process.platform === "win32" },
  );
  if (result.status !== 0) {
    console.error(
      `Failed to apply ${file}. If a ruleset with the same name exists, update it with PUT /repos/{owner}/{repo}/rulesets/{id}.`,
    );
    process.exit(result.status ?? 1);
  }
}

console.log(`Done. Optionally set default branch to staging:`);
console.log(`  gh repo edit ${repo} --default-branch staging`);
