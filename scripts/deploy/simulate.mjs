#!/usr/bin/env node
/** Validates release inputs and prints a plan without executing an adapter. */
import { loadDeploymentConfig } from "../../packages/deployment/src/index.js";
import { findRepositoryRoot } from "../lib/process-runner.mjs";
import {
  readReleaseManifest,
  resolveInsideRepository,
  simulateDeployment,
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
const mode = argValue("--mode") ?? "deploy";
const release = readReleaseManifest(root, argValue("--release-manifest"), config);
const currentRelease = mode === "rollback"
  ? readReleaseManifest(root, argValue("--current-release-manifest"), config)
  : undefined;
const plan = simulateDeployment({
  mode,
  release,
  currentRelease,
  environment: argValue("--environment") ?? "staging",
  config,
});
console.log(JSON.stringify(plan, null, 2));
