#!/usr/bin/env node
/** Builds or validates digest-only candidate and release manifests. */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  createReleaseManifest,
  digestJson,
  loadDeploymentConfig,
  validateCandidateManifest,
  validateReleaseManifest,
} from "../../packages/deployment/src/index.js";
import { findRepositoryRoot } from "../lib/process-runner.mjs";
import { resolveInsideRepository } from "../deploy/runner.mjs";

const root = findRepositoryRoot(import.meta.url);

function argValue(argv, flag) {
  const index = argv.indexOf(flag);
  return index >= 0 ? argv[index + 1] : null;
}

/** Reads JSON only from a repository-relative path. */
export function readRepositoryJson(file, repositoryRoot = root) {
  return JSON.parse(
    readFileSync(resolveInsideRepository(repositoryRoot, file, "manifest path"), "utf8"),
  );
}

/** CLI entrypoint, exported for contract tests. */
export function main(argv = process.argv.slice(2)) {
  const configPath = argValue(argv, "--config");
  const config = loadDeploymentConfig(
    configPath ? resolveInsideRepository(root, configPath, "deployment config") : undefined,
  );
  const command = argv[0];

  if (command === "validate-candidate") {
    const file = argValue(argv, "--file");
    if (!file) throw new Error("usage: validate-candidate --file <candidate.json>");
    const errors = validateCandidateManifest(readRepositoryJson(file), {
      config,
      expectedSourceRevision: argValue(argv, "--expected-source-revision") ?? undefined,
    });
    if (errors.length > 0) throw new Error(errors.join("; "));
    console.log("candidate: ok");
    return 0;
  }

  if (command === "validate-release") {
    const file = argValue(argv, "--file");
    if (!file) throw new Error("usage: validate-release --file <release.json>");
    const release = readRepositoryJson(file);
    const errors = validateReleaseManifest(release, { config });
    const expectedReleaseId = argValue(argv, "--expected-release-id");
    if (expectedReleaseId && release.releaseId !== expectedReleaseId) {
      errors.push("releaseId does not match the requested release");
    }
    if (errors.length > 0) throw new Error(errors.join("; "));
    console.log(`release: ok sha256:${digestJson(release)}`);
    return 0;
  }

  if (command === "create-release") {
    const candidatePath = argValue(argv, "--candidate");
    const releaseId = argValue(argv, "--release-id");
    const output = argValue(argv, "--out") ?? ".artifacts/release.manifest.json";
    if (!candidatePath || !releaseId) {
      throw new Error("usage: create-release --candidate <file> --release-id release-vX.Y.Z");
    }
    const candidate = readRepositoryJson(candidatePath);
    const expectedSourceRevision = argValue(argv, "--expected-source-revision");
    const candidateErrors = validateCandidateManifest(candidate, {
      config,
      expectedSourceRevision: expectedSourceRevision ?? undefined,
    });
    if (candidateErrors.length > 0) throw new Error(candidateErrors.join("; "));
    const release = createReleaseManifest(
      candidate,
      {
        releaseId,
        approvedAt: new Date().toISOString(),
        workflowRun: argValue(argv, "--workflow-run") ?? "local://manual-approval",
        actorReference: argValue(argv, "--actor") ?? "role://release-operator",
      },
      { config },
    );
    const outputPath = resolveInsideRepository(root, output, "release output");
    mkdirSync(path.dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, `${JSON.stringify(release, null, 2)}\n`);
    console.log(`wrote ${path.relative(root, outputPath)} sha256:${digestJson(release)}`);
    return 0;
  }

  console.log(`usage:
  manifest.mjs validate-candidate --file <candidate.json> [--expected-source-revision SHA]
  manifest.mjs validate-release --file <release.json> [--expected-release-id ID]
  manifest.mjs create-release --candidate <file> --release-id ID --out <file>`);
  return command && command !== "--help" ? 1 : 0;
}

if (
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
) {
  try {
    process.exitCode = main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
