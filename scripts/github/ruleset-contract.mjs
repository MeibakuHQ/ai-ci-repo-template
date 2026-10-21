#!/usr/bin/env node
/**
 * Validates the local branch-protection contract across CI and ruleset files.
 * branch-protection-config.json is authoritative for required check names.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { findRepositoryRoot } from "../lib/process-runner.mjs";

const GREPTILE_CHECK = "Greptile Review";

function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

function statusCheckRule(ruleset) {
  return ruleset.rules?.find((rule) => rule.type === "required_status_checks");
}

function pullRequestRule(ruleset) {
  return ruleset.rules?.find((rule) => rule.type === "pull_request");
}

function workflowJobBlock(workflowText, jobId) {
  const lines = workflowText.split(/\r?\n/);
  const start = lines.findIndex((line) => line === `  ${jobId}:`);
  if (start < 0) return "";
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^  [A-Za-z0-9_-]+:\s*$/.test(lines[index])) {
      end = index;
      break;
    }
  }
  return lines.slice(start, end).join("\n");
}

/** Adds the optional Greptile status check without mutating the source ruleset. */
export function withOptionalGreptile(ruleset, enabled) {
  const copy = structuredClone(ruleset);
  if (!enabled) return copy;
  const required = statusCheckRule(copy)?.parameters?.required_status_checks;
  if (!Array.isArray(required)) {
    throw new Error("ruleset has no required_status_checks contract");
  }
  if (!required.some((item) => item.context === GREPTILE_CHECK)) {
    required.push({ context: GREPTILE_CHECK });
  }
  return copy;
}

/** Returns drift between the authoritative config, workflow, and rulesets. */
export function validateRulesetContract({ config, workflowText, staging, main }) {
  const errors = [];
  const expected = config.requiredCheckNames ?? [];
  if (expected.length === 0) errors.push("requiredCheckNames must not be empty");

  for (const check of expected) {
    const escaped = check.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (!new RegExp(`^\\s+name:\\s*[\"']?${escaped}[\"']?\\s*$`, "m").test(workflowText)) {
      errors.push(`CI workflow is missing required job name: ${check}`);
    }
  }
  if (/if:\s*always\(\)/.test(workflowText)) {
    errors.push("Build and test must not bypass failed prerequisite jobs with always()");
  }
  const buildJob = workflowJobBlock(workflowText, "build-and-test");
  if (!buildJob) {
    errors.push("CI workflow is missing the build-and-test job");
  } else {
    for (const prerequisite of ["architecture", "lint", "security"]) {
      if (!new RegExp(`^\\s+-\\s+${prerequisite}\\s*$`, "m").test(buildJob)) {
        errors.push(`Build and test must depend on ${prerequisite}`);
      }
    }
  }

  for (const [label, ruleset] of [["staging", staging], ["main", main]]) {
    const actual = (statusCheckRule(ruleset)?.parameters?.required_status_checks ?? [])
      .map((item) => item.context)
      .filter((item) => item !== GREPTILE_CHECK)
      .sort();
    if (JSON.stringify(actual) !== JSON.stringify([...expected].sort())) {
      errors.push(`${label} required checks do not match branch-protection-config.json`);
    }
  }

  const mainPolicy = config.reviewPolicies?.main;
  const mainActual = pullRequestRule(main)?.parameters;
  for (const [key, expectedValue] of Object.entries(mainPolicy ?? {})) {
    if (mainActual?.[key] !== expectedValue) {
      errors.push(`main review policy ${key} must equal ${expectedValue}`);
    }
  }
  return errors;
}

/** Loads and validates the repository's branch-protection contract. */
export function loadAndValidateRulesetContract(root = findRepositoryRoot(import.meta.url)) {
  const config = readJson(path.join(root, ".github/branch-protection-config.json"));
  const workflowText = readFileSync(path.join(root, ".github/workflows/ci.yml"), "utf8");
  const staging = readJson(path.join(root, ".github/rulesets/staging.json"));
  const main = readJson(path.join(root, ".github/rulesets/main.json"));
  return {
    config,
    staging,
    main,
    errors: validateRulesetContract({ config, workflowText, staging, main }),
  };
}

function mainCli() {
  const { errors } = loadAndValidateRulesetContract();
  if (errors.length > 0) {
    console.error("rulesets:check failed:");
    for (const error of errors) console.error(`  - ${error}`);
    return 1;
  }
  console.log("rulesets:check ok");
  return 0;
}

if (
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
) {
  process.exitCode = mainCli();
}
