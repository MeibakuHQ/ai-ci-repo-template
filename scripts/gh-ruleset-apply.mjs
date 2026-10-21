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
import { existsSync } from "node:fs";
import { join } from "node:path";
import { findRepositoryRoot, runExecutable } from "./lib/process-runner.mjs";
import {
  loadAndValidateRulesetContract,
  withOptionalGreptile,
} from "./github/ruleset-contract.mjs";

const positional = process.argv.slice(2).filter((item) => !item.startsWith("--"));
const repo = positional[0];
const requireGreptile = process.argv.includes("--with-greptile");
if (!repo || !repo.includes("/")) {
  console.error("Usage: node scripts/gh-ruleset-apply.mjs OWNER/REPO");
  process.exit(1);
}

const files = ["staging.json", "main.json"];
const root = findRepositoryRoot(import.meta.url);
const dir = join(root, ".github", "rulesets");
const contract = loadAndValidateRulesetContract(root);
if (contract.errors.length > 0) {
  for (const error of contract.errors) console.error(`  - ${error}`);
  process.exit(1);
}

for (const file of files) {
  const path = join(dir, file);
  if (!existsSync(path)) {
    console.error(`Missing ${path}`);
    process.exit(1);
  }
  const base = file === "main.json" ? contract.main : contract.staging;
  const ruleset = withOptionalGreptile(base, file === "main.json" && requireGreptile);
  console.log(`Applying ${file} → ${repo}${file === "main.json" && requireGreptile ? " with Greptile" : ""} …`);
  const result = runExecutable(
    "gh",
    ["api", "-X", "POST", `repos/${repo}/rulesets`, "--input", "-"],
    { stdio: ["pipe", "inherit", "inherit"], input: `${JSON.stringify(ruleset)}\n` },
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
