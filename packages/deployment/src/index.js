/**
 * Fail-closed deployment contracts: digests-only manifests, legal state
 * transitions, recovery policy, and capability-register validation.
 * Artifact keys and registries come from docs/operations/deployment-config.json.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);

export const CANDIDATE_SCHEMA_VERSION = 1;
export const RELEASE_SCHEMA_VERSION = 1;
export const DEPLOYMENT_RECORD_SCHEMA_VERSION = 1;
export const ARTIFACT_GATE_NAME = "Artifact gate";
export const DEPLOYMENT_CAPABILITY_GATE_NAME = "Deployment capability";
export const DEPLOYMENT_ADAPTER_METHODS = [
  "validate",
  "backup",
  "migrate",
  "deploy",
  "readiness",
  "smoke",
  "rollback",
];

export const DEPLOYMENT_CAPABILITY_STATES = [
  "planned",
  "implemented",
  "ci-verified",
  "staging-proven",
  "production-proven",
  "institutionally-operable",
];

export const DEPLOYMENT_STATES = [
  "requested",
  "validated",
  "approved",
  "backup-created",
  "migrations-started",
  "migrations-completed",
  "services-deploying",
  "readiness-checking",
  "smoke-testing",
  "succeeded",
  "failed",
  "rollback-started",
  "rolled-back",
  "manual-recovery-required",
];

const legalTransitions = Object.freeze({
  requested: ["validated", "failed"],
  validated: ["approved", "failed"],
  approved: ["backup-created", "rollback-started", "failed"],
  "backup-created": ["migrations-started", "failed"],
  "migrations-started": [
    "migrations-completed",
    "failed",
    "manual-recovery-required",
  ],
  "migrations-completed": ["services-deploying", "manual-recovery-required"],
  "services-deploying": [
    "readiness-checking",
    "rollback-started",
    "manual-recovery-required",
  ],
  "readiness-checking": [
    "smoke-testing",
    "rollback-started",
    "manual-recovery-required",
  ],
  "smoke-testing": ["succeeded", "rollback-started", "manual-recovery-required"],
  "rollback-started": ["rolled-back", "manual-recovery-required"],
  succeeded: [],
  failed: [],
  "rolled-back": [],
  "manual-recovery-required": [],
});

const shaPattern = /^[a-f0-9]{40}$/;
const digestPattern = /^[a-f0-9]{64}$/;

/** Loads deployment-config.json from the repo root (or an explicit path). */
export function loadDeploymentConfig(configPath) {
  const absolute =
    configPath ??
    path.join(repoRoot, "docs/operations/deployment-config.json");
  return JSON.parse(readFileSync(absolute, "utf8"));
}

function artifactKeys(config) {
  return Object.keys(config.artifacts ?? {});
}

function digestReferencePattern(config) {
  const host = (config.digestRegistryHost ?? "ghcr.io").replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );
  return new RegExp(`^${host}\\/[a-z0-9_.-]+\\/[a-z0-9_.-]+@sha256:[a-f0-9]{64}$`);
}

function releaseIdPattern(config) {
  return new RegExp(config.releaseIdPattern ?? "^release-v[0-9]+\\.[0-9]+\\.[0-9]+$");
}

/** Canonical JSON representation used for manifest digests. */
export function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

/** Deterministically hashes a JSON value without depending on property order. */
export function digestJson(value) {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

/** Validates the product adapter before any target mutation is attempted. */
export function validateDeploymentAdapter(adapter) {
  const errors = [];
  for (const method of DEPLOYMENT_ADAPTER_METHODS) {
    if (typeof adapter?.[method] !== "function") {
      errors.push(`deployment adapter must implement ${method}()`);
    }
  }
  return errors;
}

/** Validates evidence returned by one adapter capability call. */
export function validateAdapterStepResult(result, step) {
  const errors = [];
  const durableEvidence = /^(?:https?:\/\/|artifact:\/\/|registry:\/\/|oci:\/\/|s3:\/\/|gs:\/\/|azure:\/\/)/;
  if (!result || !["pass", "fail"].includes(result.result)) {
    errors.push(`${step}: result must be pass or fail`);
  }
  if (
    !Array.isArray(result?.evidence) ||
    result.evidence.length === 0 ||
    result.evidence.some(
      (item) => !validEvidenceReference(item) || !durableEvidence.test(item),
    )
  ) {
    errors.push(`${step}: durable non-stub evidence is required`);
  }
  return errors;
}

function validDateTime(value) {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value) &&
    !Number.isNaN(Date.parse(value))
  );
}

function validEvidenceReference(value) {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    !/[\r\n]/.test(value) &&
    !/secret|password|token=/i.test(value)
  );
}

function rejectUnknownKeys(value, allowed, pathLabel, errors) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return;
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) errors.push(`${pathLabel}.${key} is not allowed`);
  }
}

function validateArtifactSet(artifacts, config, errors) {
  const keys = artifactKeys(config);
  const refPattern = digestReferencePattern(config);
  for (const key of keys) {
    const reference = artifacts?.[key]?.reference;
    const expectedRepo = config.artifacts[key].repository;
    if (!refPattern.test(reference ?? "")) {
      errors.push(`artifacts.${key}.reference must be an immutable registry digest`);
    } else if (!reference.startsWith(`${expectedRepo}@sha256:`)) {
      errors.push(`artifacts.${key}.reference uses an unapproved repository`);
    }
  }
  for (const key of Object.keys(artifacts ?? {})) {
    if (!keys.includes(key)) errors.push(`artifacts.${key} is not an approved artifact`);
  }
}

function validateMigrationProjection(migration, key, errors) {
  rejectUnknownKeys(
    migration,
    ["latest", "manifestSha256", "entries"],
    `migrations.${key}`,
    errors,
  );
  if (!digestPattern.test(migration?.manifestSha256 ?? "")) {
    errors.push(`migrations.${key}.manifestSha256 is invalid`);
  }
  if (
    typeof migration?.latest !== "string" ||
    !Array.isArray(migration?.entries) ||
    migration.entries.length === 0
  ) {
    errors.push(`migrations.${key} requires an ordered migration set`);
    return;
  }
  if (migration.entries.at(-1)?.id !== migration.latest) {
    errors.push(`migrations.${key}.latest does not match its final entry`);
  }
  for (const entry of migration.entries) {
    if (
      !entry?.id ||
      !digestPattern.test(entry?.sha256 ?? "") ||
      !["compatible", "incompatible", "unknown"].includes(
        entry?.previousApplicationCompatibility,
      )
    ) {
      errors.push(`migrations.${key} contains invalid entry metadata`);
    }
  }
}

/** Validates a post-gate candidate. Digests only — no mutable tags. */
export function validateCandidateManifest(manifest, options = {}) {
  const config = options.config ?? loadDeploymentConfig(options.configPath);
  const errors = [];
  const train = config.train ?? "release-train";
  rejectUnknownKeys(
    manifest,
    [
      "schemaVersion",
      "train",
      "sourceRevision",
      "createdAt",
      "artifacts",
      "migrations",
      "configuration",
      "verification",
    ],
    "candidate",
    errors,
  );
  if (
    manifest?.schemaVersion !== CANDIDATE_SCHEMA_VERSION ||
    manifest?.train !== train
  ) {
    errors.push("candidate identity is invalid");
  }
  if (!shaPattern.test(manifest?.sourceRevision ?? "")) {
    errors.push("sourceRevision must be a full commit SHA");
  }
  if (
    options.expectedSourceRevision &&
    manifest?.sourceRevision !== options.expectedSourceRevision
  ) {
    errors.push("sourceRevision does not match the requested commit");
  }
  if (!validDateTime(manifest?.createdAt)) {
    errors.push("createdAt must be an ISO timestamp");
  }
  validateArtifactSet(manifest?.artifacts, config, errors);
  for (const service of config.migrationServices ?? []) {
    validateMigrationProjection(manifest?.migrations?.[service], service, errors);
  }
  if (
    typeof manifest?.configuration?.configurationVersion !== "string" ||
    !manifest.configuration.configurationVersion
  ) {
    errors.push("configurationVersion is required");
  }
  if (!digestPattern.test(manifest?.configuration?.lockfileSha256 ?? "")) {
    errors.push("configuration.lockfileSha256 is invalid");
  }
  const gate = manifest?.verification?.artifactGate;
  if (gate?.name !== ARTIFACT_GATE_NAME || gate?.conclusion !== "success") {
    errors.push("successful artifact gate evidence is required");
  }
  if (gate?.ref !== "refs/heads/staging") {
    errors.push("candidate must be produced from refs/heads/staging");
  }
  if (
    gate?.headSha !== manifest?.sourceRevision ||
    !validEvidenceReference(gate?.workflowRun)
  ) {
    errors.push("artifact gate source or workflow evidence is invalid");
  }
  return errors;
}

/** Validates an immutable, human-approved release. */
export function validateReleaseManifest(release, options = {}) {
  const config = options.config ?? loadDeploymentConfig(options.configPath);
  const errors = [];
  const train = config.train ?? "release-train";
  const envs = config.environments ?? ["staging", "production"];
  rejectUnknownKeys(
    release,
    [
      "schemaVersion",
      "train",
      "releaseId",
      "candidateManifestSha256",
      "approvedAt",
      "approval",
      "candidate",
    ],
    "release",
    errors,
  );
  if (
    release?.schemaVersion !== RELEASE_SCHEMA_VERSION ||
    release?.train !== train
  ) {
    errors.push("release identity is invalid");
  }
  if (!releaseIdPattern(config).test(release?.releaseId ?? "")) {
    errors.push("releaseId is invalid");
  }
  if (!digestPattern.test(release?.candidateManifestSha256 ?? "")) {
    errors.push("candidateManifestSha256 is invalid");
  }
  if (!validDateTime(release?.approvedAt)) {
    errors.push("approvedAt must be an ISO timestamp");
  }
  if (
    !validEvidenceReference(release?.approval?.workflowRun) ||
    !validEvidenceReference(release?.approval?.actorReference) ||
    release?.approval?.environment !== "staging"
  ) {
    errors.push("staging protected-environment approval evidence is required");
  }
  if (
    !release?.candidate ||
    validateCandidateManifest(release.candidate, { config }).length > 0
  ) {
    errors.push("release does not contain a valid candidate manifest");
  }
  if (
    release?.candidate &&
    release.candidateManifestSha256 !== digestJson(release.candidate)
  ) {
    errors.push("embedded candidate digest does not match");
  }
  if (options.environment && !envs.includes(options.environment)) {
    errors.push("deployment environment is invalid");
  }
  return errors;
}

/** Creates a release by copying candidate facts; no rebuild. */
export function createReleaseManifest(candidate, meta, options = {}) {
  const config = options.config ?? loadDeploymentConfig(options.configPath);
  const candidateErrors = validateCandidateManifest(candidate, { config });
  if (candidateErrors.length > 0) throw new Error(candidateErrors.join("; "));
  const release = {
    schemaVersion: RELEASE_SCHEMA_VERSION,
    train: config.train ?? "release-train",
    releaseId: meta.releaseId,
    candidateManifestSha256: digestJson(candidate),
    approvedAt: meta.approvedAt,
    approval: {
      environment: "staging",
      workflowRun: meta.workflowRun,
      actorReference: meta.actorReference,
    },
    candidate: structuredClone(candidate),
  };
  const errors = validateReleaseManifest(release, { config });
  if (errors.length > 0) throw new Error(errors.join("; "));
  return release;
}

/** Proves whether current schema can safely roll back to a target release. */
export function evaluateReleaseRollbackCompatibility(current, target, options = {}) {
  const config = options.config ?? loadDeploymentConfig(options.configPath);
  const errors = [
    ...validateReleaseManifest(current, { config }),
    ...validateReleaseManifest(target, { config }),
  ];
  if (errors.length > 0) return { compatible: false, reason: "invalid-release-evidence" };
  for (const service of config.migrationServices ?? []) {
    const currentEntries = current.candidate.migrations[service].entries;
    const targetEntries = target.candidate.migrations[service].entries;
    if (targetEntries.length > currentEntries.length) {
      return { compatible: false, reason: `${service}-target-is-not-a-predecessor` };
    }
    for (let i = 0; i < targetEntries.length; i++) {
      if (digestJson(targetEntries[i]) !== digestJson(currentEntries[i])) {
        return { compatible: false, reason: `${service}-migration-prefix-mismatch` };
      }
    }
    if (
      currentEntries
        .slice(targetEntries.length)
        .some((entry) => entry.previousApplicationCompatibility !== "compatible")
    ) {
      return {
        compatible: false,
        reason: `${service}-previous-application-compatibility-not-proven`,
      };
    }
  }
  return { compatible: true, reason: "migration-prefix-compatible" };
}

/** Validates the honest maturity register. */
export function validateDeploymentCapabilityRegister(register, options = {}) {
  const config = options.config ?? loadDeploymentConfig(options.configPath);
  const errors = [];
  const envs = config.environments ?? ["staging", "production"];
  const scope = config.scope ?? "YOUR_PRODUCT";
  rejectUnknownKeys(
    register,
    ["schemaVersion", "scope", "lastReviewedAt", "states", "capabilities"],
    "deploymentCapabilityRegister",
    errors,
  );
  if (
    register?.schemaVersion !== 1 ||
    register?.scope !== scope ||
    !/^\d{4}-\d{2}-\d{2}$/.test(register?.lastReviewedAt ?? "")
  ) {
    errors.push("deployment capability register identity is invalid");
  }
  if (JSON.stringify(register?.states) !== JSON.stringify(DEPLOYMENT_CAPABILITY_STATES)) {
    errors.push("deployment capability maturity states are invalid");
  }
  const ids = new Set();
  for (const capability of register?.capabilities ?? []) {
    if (!capability?.id || ids.has(capability.id)) {
      errors.push(`duplicate or missing deployment capability id: ${capability?.id ?? "<missing>"}`);
    }
    ids.add(capability?.id);
    if (![ "shared", ...envs].includes(capability?.environment)) {
      errors.push(`${capability?.id}: invalid environment`);
    }
    if (!DEPLOYMENT_CAPABILITY_STATES.includes(capability?.implementationState)) {
      errors.push(`${capability?.id}: invalid implementation state`);
    }
    if (!validEvidenceReference(capability?.executableWorkflow)) {
      errors.push(`${capability?.id}: executable workflow is required`);
    }
    if (
      !validEvidenceReference(capability?.authorisedOperatorRole) ||
      !validEvidenceReference(capability?.secondaryOperatorRole) ||
      capability?.authorisedOperatorRole === capability?.secondaryOperatorRole
    ) {
      errors.push(`${capability?.id}: distinct operator roles are required`);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(capability?.lastReviewedAt ?? "")) {
      errors.push(`${capability?.id}: last review date is invalid`);
    }
    if (!Array.isArray(capability?.testEvidence) || !Array.isArray(capability?.rollbackEvidence)) {
      errors.push(`${capability?.id}: evidence arrays are required`);
    }
    if (
      !Array.isArray(capability?.blockers) ||
      capability.blockers.some((item) => typeof item !== "string" || !item.trim())
    ) {
      errors.push(`${capability?.id}: blockers must be explicit strings`);
    }
    const rank = DEPLOYMENT_CAPABILITY_STATES.indexOf(capability?.implementationState);
    if (
      rank >= DEPLOYMENT_CAPABILITY_STATES.indexOf("ci-verified") &&
      !capability.testEvidence?.some((item) => item.type === "ci-run" && item.result === "pass")
    ) {
      errors.push(`${capability?.id}: ci-verified maturity requires passing CI evidence`);
    }
    if (
      rank >= DEPLOYMENT_CAPABILITY_STATES.indexOf("staging-proven") &&
      (!capability.testEvidence?.some(
        (item) => item.type === "staging-deployment" && item.result === "pass",
      ) ||
        !capability.rollbackEvidence?.some(
          (item) => item.type === "staging-rollback" && item.result === "pass",
        ))
    ) {
      errors.push(
        `${capability?.id}: staging-proven maturity requires deployment and rollback evidence`,
      );
    }
  }
  if (!Array.isArray(register?.capabilities) || register.capabilities.length === 0) {
    errors.push("deployment capabilities are required");
  }
  return [...new Set(errors)];
}

/** Returns whether one deployment state may legally follow another. */
export function canTransition(from, to) {
  return DEPLOYMENT_STATES.includes(from) && legalTransitions[from].includes(to);
}

function validateTransitionEvidence(transition) {
  if (!DEPLOYMENT_STATES.includes(transition?.state)) {
    throw new Error("Transition state is invalid");
  }
  if (!validDateTime(transition?.timestamp)) {
    throw new Error("Transition timestamp is invalid");
  }
  if (
    !validEvidenceReference(transition?.workflowRun) ||
    !validEvidenceReference(transition?.reasonCode)
  ) {
    throw new Error("Transition evidence is invalid");
  }
  if (
    !Array.isArray(transition?.entryConditions) ||
    !Array.isArray(transition?.successConditions)
  ) {
    throw new Error("Transition conditions are required");
  }
  const conditions = [
    ...transition.entryConditions,
    ...transition.successConditions,
  ];
  if (
    conditions.some(
      (condition) =>
        !validEvidenceReference(condition?.id) ||
        !["pass", "fail", "cancelled", "denied", "skipped"].includes(
          condition?.result,
        ),
    )
  ) {
    throw new Error("Transition condition result is invalid");
  }
  if (
    !Array.isArray(transition?.evidence) ||
    transition.evidence.some((item) => !validEvidenceReference(item))
  ) {
    throw new Error("Transition evidence references are invalid");
  }
}

/** Creates the append-only record before any target mutation is allowed. */
export function createDeploymentRecord(request, transition, options = {}) {
  const config = options.config ?? loadDeploymentConfig(options.configPath);
  const envs = config.environments ?? ["staging", "production"];
  if (!envs.includes(request?.environment)) {
    throw new Error("Unknown deployment environment");
  }
  if (
    request?.schemaVersion !== 1 ||
    !releaseIdPattern(config).test(request?.releaseId ?? "") ||
    !digestPattern.test(request?.releaseManifestSha256 ?? "") ||
    typeof request?.configurationVersion !== "string" ||
    request.configurationVersion.length === 0
  ) {
    throw new Error("Invalid deployment request");
  }
  if (
    !validEvidenceReference(request?.deploymentId) ||
    !validEvidenceReference(request?.targetId) ||
    !validEvidenceReference(request?.requestedBy)
  ) {
    throw new Error("Deployment request identity is invalid");
  }
  if (transition?.state !== "requested") {
    throw new Error("First deployment transition must be requested");
  }
  validateTransitionEvidence(transition);
  return {
    schemaVersion: DEPLOYMENT_RECORD_SCHEMA_VERSION,
    deploymentId: request.deploymentId,
    releaseId: request.releaseId,
    releaseManifestSha256: request.releaseManifestSha256,
    configurationVersion: request.configurationVersion,
    environment: request.environment,
    targetId: request.targetId,
    requestedBy: request.requestedBy,
    state: "requested",
    transitions: [structuredClone(transition)],
  };
}

/** Appends one legal transition; refuses turning failed work into success. */
export function transitionDeployment(record, transition) {
  validateTransitionEvidence(transition);
  if (!canTransition(record.state, transition.state)) {
    throw new Error(`Illegal deployment transition: ${record.state} -> ${transition.state}`);
  }
  if (
    transition.state === "succeeded" &&
    transition.successConditions.some((item) => item.result !== "pass")
  ) {
    throw new Error(
      "A failed, cancelled, denied, or skipped condition cannot produce succeeded",
    );
  }
  return {
    ...record,
    state: transition.state,
    transitions: [...record.transitions, structuredClone(transition)],
    ...([
      "succeeded",
      "failed",
      "rolled-back",
      "manual-recovery-required",
    ].includes(transition.state)
      ? { completedAt: transition.timestamp }
      : {}),
  };
}

/** Selects the only automated recovery permitted by migration compatibility. */
export function decideRecovery({
  mutationStarted,
  migrationTransactionRolledBack,
  previousApplicationCompatible,
  dataIntegrityCertain,
  recoveryChecksPass,
  knownGoodAvailable,
}) {
  if (!mutationStarted) {
    return {
      action: "stop",
      terminalState: "failed",
      reasonCode: "pre-mutation-failure",
    };
  }
  if (!dataIntegrityCertain) {
    return {
      action: "manual-recovery",
      terminalState: "manual-recovery-required",
      reasonCode: "data-integrity-uncertain",
    };
  }
  if (!migrationTransactionRolledBack && previousApplicationCompatible !== true) {
    return {
      action: "roll-forward",
      terminalState: "manual-recovery-required",
      reasonCode: "schema-not-backward-compatible",
    };
  }
  if (
    previousApplicationCompatible === true &&
    knownGoodAvailable === true &&
    recoveryChecksPass === true
  ) {
    return {
      action: "redeploy-known-good",
      terminalState: "rolled-back",
      reasonCode: "compatible-known-good",
    };
  }
  return {
    action: "manual-recovery",
    terminalState: "manual-recovery-required",
    reasonCode: "recovery-not-proven",
  };
}

/** Validates a time-limited break-glass record without accepting secret values. */
export function validateBreakGlassRecord(record, now = new Date()) {
  const errors = [];
  if (record?.schemaVersion !== 1) errors.push("break-glass schemaVersion is invalid");
  for (const field of [
    "incidentReference",
    "requesterReference",
    "approverReference",
    "reason",
    "createdAt",
    "expiresAt",
    "reconciliationDueAt",
  ]) {
    if (!validEvidenceReference(record?.[field])) errors.push(`${field} is required`);
  }
  if (
    !validDateTime(record?.createdAt) ||
    !validDateTime(record?.expiresAt) ||
    !validDateTime(record?.reconciliationDueAt)
  ) {
    errors.push("break-glass timestamps are invalid");
  }
  if (record?.requesterReference === record?.approverReference) {
    errors.push("requester and approver must differ");
  }
  if (!Array.isArray(record?.changes) || record.changes.length === 0) {
    errors.push("break-glass changes are required");
  }
  for (const change of record?.changes ?? []) {
    if (
      !change?.field ||
      !change?.authorityReference ||
      !change?.configurationVersion ||
      !["secret", "non-secret"].includes(change?.classification)
    ) {
      errors.push("break-glass change metadata is incomplete");
    }
    if (
      change?.classification === "secret" &&
      ("oldValue" in change || "newValue" in change)
    ) {
      errors.push("secret break-glass changes must not contain values");
    }
  }
  if (
    validDateTime(record?.expiresAt) &&
    Date.parse(record.expiresAt) <= now.getTime() &&
    !record?.reconciledAt
  ) {
    errors.push("break-glass record is expired and unreconciled");
  }
  return errors;
}

export function getEnvironments(config) {
  return (config ?? loadDeploymentConfig()).environments ?? ["staging", "production"];
}

export function getArtifactKeys(config) {
  return artifactKeys(config ?? loadDeploymentConfig());
}
