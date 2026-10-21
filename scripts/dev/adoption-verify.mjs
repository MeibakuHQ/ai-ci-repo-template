#!/usr/bin/env node
/**
 * Fails copied product repositories that still present scaffold placeholders as
 * implemented governance. The template-only bypass verifies repository identity.
 */
import { execFileSync } from "node:child_process";
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { validateInvariantProfiles } from "../../packages/governance/src/index.js";
import { loadDeploymentAdapter } from "../deploy/runner.mjs";
import { findRepositoryRoot } from "../lib/process-runner.mjs";

const SKIP_DIRECTORIES = new Set([".git", "node_modules", "dist", "coverage", "opensrc"]);
const TEXT_EXTENSIONS = new Set([".md", ".json", ".yml", ".yaml", ".mjs", ".js", ".ts", ".tsx", ".ps1"]);

function walk(root, current = root, output = []) {
  for (const entry of readdirSync(current)) {
    if (SKIP_DIRECTORIES.has(entry)) continue;
    const absolute = path.join(current, entry);
    if (statSync(absolute).isDirectory()) walk(root, absolute, output);
    else if (TEXT_EXTENSIONS.has(path.extname(entry))) output.push(path.relative(root, absolute));
  }
  return output;
}

/** Returns every unresolved product-adoption blocker. */
export async function assessAdoption(root) {
  const errors = [];
  for (const relative of walk(root)) {
    if (/\.test\.[cm]?[jt]sx?$/.test(relative)) continue;
    const text = readFileSync(path.join(root, relative), "utf8");
    if (/YOUR_(?:ORG|REPO|TEAM|PRODUCT|PROJECT)/.test(text)) {
      errors.push(`${relative}: unresolved YOUR_* placeholder`);
    }
  }

  const contextPath = path.join(root, "docs/CONTEXT.md");
  const context = existsSync(contextPath) ? readFileSync(contextPath, "utf8") : "";
  if (!context || /Replace this stub|_\(add terms\)_/.test(context)) {
    errors.push("docs/CONTEXT.md: product vocabulary is not configured");
  }

  const architectureRoot = path.join(root, "tests/architecture");
  const productArchitectureTests = existsSync(architectureRoot)
    ? readdirSync(architectureRoot).filter(
        (name) =>
          name.endsWith(".test.mjs") &&
          !name.startsWith("template-") &&
          !["placeholder.test.mjs", "docs-inventory-sync.test.mjs"].includes(name),
      )
    : [];
  if (productArchitectureTests.length === 0) {
    errors.push("tests/architecture: add at least one product boundary test");
  }

  const serviceCatalogPath = path.join(root, "docs/operations/service-catalog.json");
  if (!existsSync(serviceCatalogPath)) {
    errors.push("service-catalog.json: product service ownership is not configured");
  } else {
    const serviceCatalog = JSON.parse(readFileSync(serviceCatalogPath, "utf8"));
    const genericOwners = new Set([
      "role://platform-engineer",
      "role://team",
      "role://owner",
      "role://maintainer",
    ]);
    if (
      !Array.isArray(serviceCatalog.services) ||
      serviceCatalog.services.length === 0 ||
      serviceCatalog.services.some((service) => genericOwners.has(service.ownerRole))
    ) {
      errors.push("service-catalog.json: replace generic service ownership with product roles");
    }
  }

  const deploymentConfigPath = path.join(root, "docs/operations/deployment-config.json");
  const deploymentConfig = existsSync(deploymentConfigPath)
    ? JSON.parse(readFileSync(deploymentConfigPath, "utf8"))
    : {};
  if (!deploymentConfig.deploymentAdapterModule) {
    errors.push("deployment-config.json: deploymentAdapterModule is not configured");
  } else {
    try {
      await loadDeploymentAdapter(root, deploymentConfig);
    } catch (error) {
      errors.push(`deployment-config.json: configured deployment adapter is invalid (${error.message})`);
    }
  }

  const profilePath = path.join(
    root,
    deploymentConfig.invariantProfilesPath ?? "docs/governance/invariant-profiles.json",
  );
  if (!existsSync(profilePath)) {
    errors.push("invariant profile register is missing");
  } else {
    const register = JSON.parse(readFileSync(profilePath, "utf8"));
    errors.push(...validateInvariantProfiles(register, {
      requireClassified: true,
      testPathExists: (relative) => existsSync(path.join(root, relative)),
    }));
  }
  return [...new Set(errors)].sort();
}

/** Allows scaffold self-tests only for the canonical template repository. */
export function validateTemplateSelfCheck(root) {
  const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
  if (pkg.name !== "@meibaku/ai-ci-repo-template") {
    return ["template self-check requires the canonical package name"];
  }
  let remote = "";
  try {
    remote = execFileSync("git", ["config", "--get", "remote.origin.url"], {
      cwd: root,
      encoding: "utf8",
    }).trim();
  } catch {
    return ["template self-check requires the canonical git remote"];
  }
  if (!/github\.com[:/]MeibakuHQ\/ai-ci-repo-template(?:\.git)?$/i.test(remote)) {
    return ["template self-check requires the canonical git remote"];
  }
  return [];
}

export async function main(argv = process.argv.slice(2), root = findRepositoryRoot(import.meta.url)) {
  const errors = await assessAdoption(root);
  if (argv.includes("--template-self-check")) {
    const identityErrors = validateTemplateSelfCheck(root);
    if (identityErrors.length > 0) {
      for (const error of identityErrors) console.error(`  - ${error}`);
      return 1;
    }
    if (errors.length === 0) {
      console.error("template self-check expected scaffold adoption blockers but found none");
      return 1;
    }
    console.log(`adoption:verify template self-check ok (${errors.length} expected blockers)`);
    return 0;
  }
  if (errors.length > 0) {
    console.error("adoption:verify failed:");
    for (const error of errors) console.error(`  - ${error}`);
    return 1;
  }
  console.log("adoption:verify ok");
  return 0;
}

if (
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
) {
  process.exitCode = await main();
}
