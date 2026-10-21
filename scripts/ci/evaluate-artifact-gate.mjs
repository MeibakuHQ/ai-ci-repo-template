#!/usr/bin/env node
/**
 * Fail-closed artifact gate aggregator: architecture + capability audit.
 */
import path from "node:path";
import {
  findRepositoryRoot,
  runExecutable,
  runPackageScript,
} from "../lib/process-runner.mjs";

const root = findRepositoryRoot(import.meta.url);

const arch = runPackageScript("test:architecture", [], { cwd: root });
if ((arch.status ?? 1) !== 0) {
  console.error("ci:artifact-gate: architecture failed");
  process.exit(1);
}

const cap = runExecutable(
  process.execPath,
  [path.join(root, "scripts/deploy/capability-audit.mjs")],
  { cwd: root, stdio: "inherit" },
);
if ((cap.status ?? 1) !== 0) {
  console.error("ci:artifact-gate: capability audit failed");
  process.exit(1);
}

console.log("ci:artifact-gate ok");
