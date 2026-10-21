#!/usr/bin/env node
/**
 * Validates docs/operations/deployment-capability-register.json against
 * packages/deployment rules (honest maturity; no secret fields).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadDeploymentConfig,
  validateDeploymentCapabilityRegister,
} from "../../packages/deployment/src/index.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const config = loadDeploymentConfig();
const register = JSON.parse(
  readFileSync(
    path.join(root, "docs/operations/deployment-capability-register.json"),
    "utf8",
  ),
);
const errors = validateDeploymentCapabilityRegister(register, { config });
if (errors.length) {
  console.error("deployment capability audit failed:");
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}
console.log("deployment:capability:audit ok");
