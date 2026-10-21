#!/usr/bin/env node
/**
 * Clean-machine onboarding proof: runs template gates in sequence.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";

const steps = [
  ["dev:doctor", ["run", "dev:doctor"]],
  ["docs:facts:check", ["run", "docs:facts:check"]],
  ["test:architecture", ["run", "test:architecture"]],
  ["ci:lint", ["run", "ci:lint"]],
  ["ci:security", ["run", "ci:security"]],
  ["deployment:capability:audit", ["run", "deployment:capability:audit"]],
];

for (const [name, args] of steps) {
  console.log(`\n==> ${name}`);
  const result = spawnSync(npm, args, { cwd: root, stdio: "inherit", shell: true });
  if ((result.status ?? 1) !== 0) {
    console.error(`onboarding:verify failed at ${name}`);
    process.exit(1);
  }
}

console.log("\nonboarding:verify ok");
