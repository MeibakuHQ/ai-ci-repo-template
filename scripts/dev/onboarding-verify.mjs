#!/usr/bin/env node
/**
 * Clean-machine onboarding proof: runs template gates in sequence.
 */
import { findRepositoryRoot, runPackageScript } from "../lib/process-runner.mjs";

const root = findRepositoryRoot(import.meta.url);

const templateSelfCheck = process.argv.includes("--template-self-check");
const steps = [
  ["adoption:verify", templateSelfCheck ? ["--", "--template-self-check"] : []],
  ["dev:doctor", []],
  ["docs:facts:check", []],
  ["test:architecture", []],
  ["ci:lint", []],
  ["ci:security", []],
  ["deployment:capability:audit", []],
];

for (const [name, args] of steps) {
  console.log(`\n==> ${name}`);
  const result = runPackageScript(name, args, { cwd: root });
  if ((result.status ?? 1) !== 0) {
    console.error(`onboarding:verify failed at ${name}`);
    process.exit(1);
  }
}

console.log("\nonboarding:verify ok");
