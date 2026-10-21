#!/usr/bin/env node
/**
 * Validates docs/operations/deployment-capability-register.json against
 * packages/deployment rules (honest maturity; no secret fields).
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  DEPLOYMENT_CAPABILITY_STATES,
  loadDeploymentConfig,
  validateDeploymentCapabilityRegister,
} from "../../packages/deployment/src/index.js";
import { findRepositoryRoot } from "../lib/process-runner.mjs";

const root = findRepositoryRoot(import.meta.url);
const config = loadDeploymentConfig();
const register = JSON.parse(
  readFileSync(
    path.join(root, "docs/operations/deployment-capability-register.json"),
    "utf8",
  ),
);
const errors = validateDeploymentCapabilityRegister(register, { config });
const environmentIndex = process.argv.indexOf("--environment");
const environment = environmentIndex >= 0 ? process.argv[environmentIndex + 1] : null;
if (process.argv.includes("--require-executable")) {
  const capability = register.capabilities.find((item) => item.environment === environment);
  const rank = DEPLOYMENT_CAPABILITY_STATES.indexOf(capability?.implementationState);
  if (!capability || rank < DEPLOYMENT_CAPABILITY_STATES.indexOf("ci-verified")) {
    errors.push(`${environment ?? "<missing>"}: deployment capability is not ci-verified`);
  }
  if (environment === "production") {
    const staging = register.capabilities.find((item) => item.environment === "staging");
    const stagingRank = DEPLOYMENT_CAPABILITY_STATES.indexOf(staging?.implementationState);
    if (stagingRank < DEPLOYMENT_CAPABILITY_STATES.indexOf("staging-proven")) {
      errors.push("production execution requires staging-proven deployment and rollback evidence");
    }
  }
  if (!config.deploymentAdapterModule) {
    errors.push("deployment adapter is not configured");
  } else if (!existsSync(path.join(root, config.deploymentAdapterModule))) {
    errors.push("configured deployment adapter does not exist");
  }
}
if (errors.length) {
  console.error("deployment capability audit failed:");
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}
console.log("deployment:capability:audit ok");
