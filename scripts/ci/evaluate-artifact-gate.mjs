#!/usr/bin/env node
/**
 * Fail-closed artifact gate aggregator: architecture + capability audit.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";

const arch = spawnSync(npm, ["run", "test:architecture"], {
  cwd: root,
  stdio: "inherit",
  shell: true,
});
if ((arch.status ?? 1) !== 0) {
  console.error("ci:artifact-gate: architecture failed");
  process.exit(1);
}

const cap = spawnSync(
  process.execPath,
  [path.join(root, "scripts/deploy/capability-audit.mjs")],
  { cwd: root, stdio: "inherit" },
);
if ((cap.status ?? 1) !== 0) {
  console.error("ci:artifact-gate: capability audit failed");
  process.exit(1);
}

console.log("ci:artifact-gate ok");
