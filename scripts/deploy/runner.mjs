/**
 * Deployment orchestration at the product-adapter seam. State transitions are
 * recorded only from validated adapter evidence; failures terminate explicitly.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  canTransition,
  createDeploymentRecord,
  digestJson,
  evaluateReleaseRollbackCompatibility,
  transitionDeployment,
  validateAdapterStepResult,
  validateDeploymentAdapter,
  validateReleaseManifest,
} from "../../packages/deployment/src/index.js";

/** Resolves a caller path while refusing absolute paths and repository escape. */
export function resolveInsideRepository(root, value, label = "path") {
  if (!value || path.isAbsolute(value)) {
    throw new Error(`${label} must be a repository-relative path`);
  }
  const absolute = path.resolve(root, value);
  const relative = path.relative(root, absolute);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`${label} must stay inside the repository`);
  }
  return absolute;
}

/** Loads and validates an immutable release manifest from the repository. */
export function readReleaseManifest(root, value, config) {
  const absolute = resolveInsideRepository(root, value, "release manifest");
  if (!existsSync(absolute)) throw new Error(`release manifest does not exist: ${value}`);
  const release = JSON.parse(readFileSync(absolute, "utf8"));
  const errors = validateReleaseManifest(release, { config });
  if (errors.length > 0) throw new Error(errors.join("; "));
  return release;
}

/** Loads a configured product adapter; the template intentionally has none. */
export async function loadDeploymentAdapter(root, config) {
  const configured = config.deploymentAdapterModule;
  if (!configured) throw new Error("DEPLOYMENT_ADAPTER_UNCONFIGURED");
  const absolute = resolveInsideRepository(root, configured, "deployment adapter");
  if (!existsSync(absolute)) {
    throw new Error(`deployment adapter does not exist: ${configured}`);
  }
  const imported = await import(pathToFileURL(absolute).href);
  const adapter = imported.default ?? imported.deploymentAdapter ?? imported;
  const errors = validateDeploymentAdapter(adapter);
  if (errors.length > 0) throw new Error(errors.join("; "));
  return adapter;
}

function transition(state, workflowRun, reasonCode, evidence, result = "pass") {
  return {
    state,
    timestamp: new Date().toISOString(),
    workflowRun,
    reasonCode,
    entryConditions: [{ id: `${reasonCode}-entry`, result: "pass" }],
    successConditions: [{ id: `${reasonCode}-result`, result }],
    evidence,
  };
}

async function callAdapter(adapter, step, context) {
  const result = await adapter[step](context);
  const errors = validateAdapterStepResult(result, step);
  if (errors.length > 0) throw Object.assign(new Error(errors.join("; ")), { stepResult: result });
  if (result.result !== "pass") {
    throw Object.assign(new Error(`${step} failed`), { stepResult: result });
  }
  return result;
}

function terminalFailure(record, workflowRun, error) {
  const target = canTransition(record.state, "failed")
    ? "failed"
    : "manual-recovery-required";
  if (!canTransition(record.state, target)) return record;
  const evidence = error?.stepResult?.evidence ?? [workflowRun];
  return transitionDeployment(
    record,
    transition(target, workflowRun, "adapter-failure", evidence, "fail"),
  );
}

function createRecord({ release, environment, config, workflowRun, actor }) {
  return createDeploymentRecord(
    {
      schemaVersion: 1,
      deploymentId: `deploy://${environment}/${Date.now()}`,
      releaseId: release.releaseId,
      releaseManifestSha256: digestJson(release),
      configurationVersion: release.candidate.configuration.configurationVersion,
      environment,
      targetId: `target://${environment}`,
      requestedBy: actor,
    },
    transition("requested", workflowRun, "operator-request", [workflowRun]),
    { config },
  );
}

/** Executes deployment capabilities in state-machine order. */
export async function executeDeployment({ release, environment, config, adapter, workflowRun, actor }) {
  let record = createRecord({ release, environment, config, workflowRun, actor });
  const context = { release, environment, config, workflowRun };
  try {
    let result = await callAdapter(adapter, "validate", context);
    record = transitionDeployment(record, transition("validated", workflowRun, "target-validated", result.evidence));
    record = transitionDeployment(record, transition("approved", workflowRun, "protected-environment-approved", [workflowRun]));
    result = await callAdapter(adapter, "backup", context);
    record = transitionDeployment(record, transition("backup-created", workflowRun, "backup-created", result.evidence));
    record = transitionDeployment(record, transition("migrations-started", workflowRun, "migrations-started", [workflowRun]));
    result = await callAdapter(adapter, "migrate", context);
    record = transitionDeployment(record, transition("migrations-completed", workflowRun, "migrations-completed", result.evidence));
    record = transitionDeployment(record, transition("services-deploying", workflowRun, "services-deploying", [workflowRun]));
    result = await callAdapter(adapter, "deploy", context);
    record = transitionDeployment(record, transition("readiness-checking", workflowRun, "services-deployed", result.evidence));
    result = await callAdapter(adapter, "readiness", context);
    record = transitionDeployment(record, transition("smoke-testing", workflowRun, "readiness-passed", result.evidence));
    result = await callAdapter(adapter, "smoke", context);
    record = transitionDeployment(record, transition("succeeded", workflowRun, "smoke-passed", result.evidence));
    return { ok: true, record };
  } catch (error) {
    return { ok: false, record: terminalFailure(record, workflowRun, error), error };
  }
}

/** Executes a proven-compatible rollback through the same adapter seam. */
export async function executeRollback({ currentRelease, targetRelease, environment, config, adapter, workflowRun, actor }) {
  const compatibility = evaluateReleaseRollbackCompatibility(currentRelease, targetRelease, { config });
  if (!compatibility.compatible) {
    throw new Error(`ROLLBACK_INCOMPATIBLE: ${compatibility.reason}`);
  }
  let record = createRecord({ release: targetRelease, environment, config, workflowRun, actor });
  const context = { currentRelease, targetRelease, release: targetRelease, environment, config, workflowRun };
  try {
    const validated = await callAdapter(adapter, "validate", context);
    record = transitionDeployment(record, transition("validated", workflowRun, "target-validated", validated.evidence));
    record = transitionDeployment(record, transition("approved", workflowRun, "protected-environment-approved", [workflowRun]));
    record = transitionDeployment(record, transition("rollback-started", workflowRun, "rollback-started", [workflowRun]));
    const result = await callAdapter(adapter, "rollback", context);
    record = transitionDeployment(record, transition("rolled-back", workflowRun, "rollback-completed", result.evidence));
    return { ok: true, record };
  } catch (error) {
    return { ok: false, record: terminalFailure(record, workflowRun, error), error };
  }
}

/** Produces a non-mutating plan that deliberately has no success state. */
export function simulateDeployment({ mode, release, currentRelease, environment, config }) {
  if (!(config.environments ?? []).includes(environment)) {
    throw new Error(`unknown environment: ${environment}`);
  }
  if (mode === "rollback") {
    const compatibility = evaluateReleaseRollbackCompatibility(currentRelease, release, { config });
    if (!compatibility.compatible) {
      throw new Error(`ROLLBACK_INCOMPATIBLE: ${compatibility.reason}`);
    }
  }
  return {
    simulation: true,
    mode,
    environment,
    releaseId: release.releaseId,
    releaseManifestSha256: digestJson(release),
    terminalState: null,
    mutationAttempted: false,
  };
}
