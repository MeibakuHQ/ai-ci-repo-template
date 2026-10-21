#!/usr/bin/env node
/**
 * Print opensrc cache path for a package, respecting manifest.blocked.
 * Soft-skips when opensrc is not installed.
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runOpensrc } from "./lib/run-opensrc.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
let cwdFlag = ".";
const pkgParts = [];

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--cwd" && args[i + 1]) cwdFlag = args[++i];
  else pkgParts.push(args[i]);
}

const id = pkgParts.join(" ");
if (!id) {
  console.error("Usage: node scripts/opensrc-path.mjs <package> [--cwd .]");
  process.exit(1);
}

const manifestPath = path.join(root, "opensrc", "manifest.json");
if (existsSync(manifestPath)) {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const blocked = manifest.blocked?.find((b) => b.id === id);
  if (blocked && !process.argv.includes("--force")) {
    console.error(`Blocked: ${id}\n${blocked.reason ?? ""}`);
    process.exit(1);
  }
}

const result = runOpensrc(root, ["path", id, "--cwd", cwdFlag], { stdio: "inherit" });
process.exit(result.skipped ? 0 : result.status ?? 1);
