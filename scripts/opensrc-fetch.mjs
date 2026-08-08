#!/usr/bin/env node
/**
 * Pre-fetch OpenSRC sources from opensrc/manifest.json (small packages only).
 * Soft-skips when opensrc is not installed.
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runOpensrc } from "./lib/run-opensrc.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = path.join(root, "opensrc", "manifest.json");

if (!existsSync(manifestPath)) {
  console.error("missing opensrc/manifest.json");
  process.exit(1);
}

const probe = runOpensrc(root, ["--help"], { stdio: "pipe" });
if (probe.skipped) process.exit(0);

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const includeOptional = process.argv.includes("--optional");
const forceBlocked = process.argv.includes("--force-blocked");
const blockedIds = new Set((manifest.blocked ?? []).map((b) => b.id));
const entries = [
  ...(manifest.packages ?? []),
  ...(includeOptional ? manifest.optional ?? [] : []),
];

let failed = 0;
let skipped = 0;

for (const entry of entries) {
  const id = entry.id;
  if (blockedIds.has(id) && !forceBlocked) {
    console.log(`⊘ skip (blocked): ${id}`);
    skipped += 1;
    continue;
  }
  console.log(`→ opensrc fetch ${id}`);
  const result = runOpensrc(root, ["fetch", id, "--cwd", entry.cwd ?? "."], {
    stdio: "inherit",
  });
  if (result.status !== 0) failed += 1;
}

console.log(`opensrc:fetch done (failed=${failed}, skipped=${skipped})`);
process.exit(failed > 0 ? 1 : 0);
