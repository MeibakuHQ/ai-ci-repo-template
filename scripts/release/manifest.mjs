#!/usr/bin/env node
/**
 * Build or validate a candidate / release manifest (digest-only; no rebuild).
 *
 *   node scripts/release/manifest.mjs validate-candidate --file path.json
 *   node scripts/release/manifest.mjs create-release --candidate path.json --release-id release-v1.0.0
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createReleaseManifest,
  loadDeploymentConfig,
  validateCandidateManifest,
  validateReleaseManifest,
} from "../../packages/deployment/src/index.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const config = loadDeploymentConfig();

function argValue(flag) {
  const idx = process.argv.indexOf(flag);
  return idx >= 0 ? process.argv[idx + 1] : null;
}

function readJson(file) {
  return JSON.parse(readFileSync(path.resolve(root, file), "utf8"));
}

const cmd = process.argv[2];

if (cmd === "validate-candidate") {
  const file = argValue("--file");
  if (!file) {
    console.error("usage: validate-candidate --file <candidate.json>");
    process.exit(1);
  }
  const errors = validateCandidateManifest(readJson(file), { config });
  if (errors.length) {
    console.error(errors.join("\n"));
    process.exit(1);
  }
  console.log("candidate: ok");
} else if (cmd === "validate-release") {
  const file = argValue("--file");
  if (!file) {
    console.error("usage: validate-release --file <release.json>");
    process.exit(1);
  }
  const errors = validateReleaseManifest(readJson(file), { config });
  if (errors.length) {
    console.error(errors.join("\n"));
    process.exit(1);
  }
  console.log("release: ok");
} else if (cmd === "create-release") {
  const candidatePath = argValue("--candidate");
  const releaseId = argValue("--release-id");
  const out = argValue("--out") ?? "release.manifest.json";
  if (!candidatePath || !releaseId) {
    console.error(
      "usage: create-release --candidate <file> --release-id release-vX.Y.Z [--out file]",
    );
    process.exit(1);
  }
  const release = createReleaseManifest(
    readJson(candidatePath),
    {
      releaseId,
      approvedAt: new Date().toISOString(),
      workflowRun: argValue("--workflow-run") ?? "local://manual-approval",
      actorReference: argValue("--actor") ?? "role://release-operator",
    },
    { config },
  );
  writeFileSync(path.resolve(root, out), `${JSON.stringify(release, null, 2)}\n`);
  console.log(`wrote ${out}`);
} else {
  console.log(`usage:
  manifest.mjs validate-candidate --file <candidate.json>
  manifest.mjs validate-release --file <release.json>
  manifest.mjs create-release --candidate <file> --release-id release-vX.Y.Z [--out file]`);
  process.exit(cmd && cmd !== "--help" ? 1 : 0);
}
