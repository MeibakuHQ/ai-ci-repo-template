#!/usr/bin/env node
/** Executes a real deploy or rollback through a configured product adapter. */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { loadDeploymentConfig } from "../../packages/deployment/src/index.js";
import { findRepositoryRoot } from "../lib/process-runner.mjs";
import {
  executeDeployment,
  executeRollback,
  loadDeploymentAdapter,
  readReleaseManifest,
  resolveInsideRepository,
} from "./runner.mjs";

function argValue(flag) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : null;
}

const root = findRepositoryRoot(import.meta.url);
const configPath = argValue("--config");
const config = loadDeploymentConfig(
  configPath ? resolveInsideRepository(root, configPath, "deployment config") : undefined,
);
const mode = argValue("--mode");
const environment = argValue("--environment");
const releasePath = argValue("--release-manifest");
const releaseId = argValue("--release-id");
const workflowRun = argValue("--workflow-run");
const actor = argValue("--actor");
const output = argValue("--out") ?? ".artifacts/deployment-record.json";

if (!process.argv.includes("--execute")) {
  console.error("Execution requires --execute; use npm run deploy:simulate for a non-mutating plan");
  process.exit(1);
}
if (!mode || !["deploy", "rollback"].includes(mode)) {
  throw new Error("--mode must be deploy or rollback");
}
if (!environment || !releasePath || !releaseId || !workflowRun || !actor) {
  throw new Error("environment, release manifest, release id, workflow run, and actor are required");
}
if (!(config.environments ?? []).includes(environment)) {
  throw new Error(`unknown environment: ${environment}`);
}

const release = readReleaseManifest(root, releasePath, config);
if (release.releaseId !== releaseId) {
  throw new Error("release id does not match the manifest");
}
const adapter = await loadDeploymentAdapter(root, config);
const result = mode === "deploy"
  ? await executeDeployment({ release, environment, config, adapter, workflowRun, actor })
  : await executeRollback({
      currentRelease: readReleaseManifest(
        root,
        argValue("--current-release-manifest"),
        config,
      ),
      targetRelease: release,
      environment,
      config,
      adapter,
      workflowRun,
      actor,
    });

const outputPath = resolveInsideRepository(root, output, "deployment record output");
mkdirSync(path.dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(result.record, null, 2)}\n`);
console.log(`wrote ${path.relative(root, outputPath)}`);
if (!result.ok) {
  console.error(result.error instanceof Error ? result.error.message : result.error);
  process.exitCode = 1;
}
