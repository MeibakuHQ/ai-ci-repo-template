import assert from "node:assert/strict";
import test from "node:test";
import {
  canTransition,
  decideRecovery,
  digestJson,
  loadDeploymentConfig,
  transitionDeployment,
  createDeploymentRecord,
  validateDeploymentCapabilityRegister,
  validateBreakGlassRecord,
  validateAdapterStepResult,
  validateDeploymentAdapter,
  validateCandidateManifest,
} from "../src/index.js";

const config = loadDeploymentConfig();

test("loadDeploymentConfig exposes example artifacts", () => {
  assert.ok(config.artifacts.api);
  assert.ok(config.artifacts.web);
  assert.ok(config.artifacts.migrations);
  assert.deepEqual(config.environments, ["staging", "production"]);
});

test("digestJson is order-independent", () => {
  assert.equal(digestJson({ a: 1, b: 2 }), digestJson({ b: 2, a: 1 }));
});

test("canTransition enforces legal edges only", () => {
  assert.equal(canTransition("requested", "validated"), true);
  assert.equal(canTransition("requested", "succeeded"), false);
  assert.equal(canTransition("succeeded", "failed"), false);
});

test("transitionDeployment refuses illegal jumps and failed success", () => {
  const transition = {
    state: "requested",
    timestamp: "2026-01-01T00:00:00Z",
    workflowRun: "https://example.test/run/1",
    reasonCode: "operator-request",
    entryConditions: [{ id: "request-valid", result: "pass" }],
    successConditions: [{ id: "recorded", result: "pass" }],
    evidence: ["https://example.test/evidence/1"],
  };
  const record = createDeploymentRecord(
    {
      schemaVersion: 1,
      deploymentId: "deploy://staging/1",
      releaseId: "release-v1.0.0",
      releaseManifestSha256: "a".repeat(64),
      configurationVersion: "staging-1",
      environment: "staging",
      targetId: "target://staging",
      requestedBy: "role://operator",
    },
    transition,
    { config },
  );
  assert.equal(record.state, "requested");

  const next = transitionDeployment(record, {
    ...transition,
    state: "validated",
    reasonCode: "validated",
  });
  assert.equal(next.state, "validated");

  assert.throws(() =>
    transitionDeployment(next, {
      ...transition,
      state: "succeeded",
      reasonCode: "skip",
    }),
  );
});

test("decideRecovery prefers known-good only when proven", () => {
  assert.equal(
    decideRecovery({
      mutationStarted: false,
      migrationTransactionRolledBack: false,
      previousApplicationCompatible: true,
      dataIntegrityCertain: true,
      recoveryChecksPass: true,
      knownGoodAvailable: true,
    }).action,
    "stop",
  );
  assert.equal(
    decideRecovery({
      mutationStarted: true,
      migrationTransactionRolledBack: true,
      previousApplicationCompatible: true,
      dataIntegrityCertain: true,
      recoveryChecksPass: true,
      knownGoodAvailable: true,
    }).action,
    "redeploy-known-good",
  );
});

test("validateDeploymentCapabilityRegister accepts planned template register", async () => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  const path = await import("node:path");
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
  const register = JSON.parse(
    readFileSync(
      path.join(root, "docs/operations/deployment-capability-register.json"),
      "utf8",
    ),
  );
  assert.deepEqual(validateDeploymentCapabilityRegister(register, { config }), []);
});

test("validateBreakGlassRecord rejects shared requester/approver", () => {
  const errors = validateBreakGlassRecord({
    schemaVersion: 1,
    incidentReference: "incident://1",
    requesterReference: "role://a",
    approverReference: "role://a",
    reason: "outage",
    createdAt: "2026-01-01T00:00:00Z",
    expiresAt: "2099-01-01T00:00:00Z",
    reconciliationDueAt: "2099-01-02T00:00:00Z",
    changes: [
      {
        field: "FEATURE_FLAG",
        authorityReference: "env://staging",
        configurationVersion: "staging-1",
        classification: "non-secret",
        oldValue: "off",
        newValue: "on",
      },
    ],
  });
  assert.ok(errors.some((e) => e.includes("requester and approver")));
});

test("deployment adapter contracts reject missing methods and stub evidence", () => {
  assert.ok(validateDeploymentAdapter({}).length > 0);
  assert.deepEqual(
    validateAdapterStepResult(
      { result: "pass", evidence: ["stub://succeeded"] },
      "smoke",
    ),
    ["smoke: durable non-stub evidence is required"],
  );
});

test("candidate validation rejects a workflow SHA mismatch", () => {
  const candidate = {
    schemaVersion: 1,
    train: config.train,
    sourceRevision: "a".repeat(40),
    createdAt: "2026-10-10T00:00:00Z",
    artifacts: Object.fromEntries(
      Object.entries(config.artifacts).map(([key, value]) => [
        key,
        { reference: `${value.repository}@sha256:${"b".repeat(64)}` },
      ]),
    ),
    migrations: {
      api: {
        latest: "001",
        manifestSha256: "c".repeat(64),
        entries: [{ id: "001", sha256: "d".repeat(64), previousApplicationCompatibility: "compatible" }],
      },
    },
    configuration: { configurationVersion: "staging-1", lockfileSha256: "e".repeat(64) },
    verification: {
      artifactGate: {
        name: "Artifact gate",
        conclusion: "success",
        ref: "refs/heads/staging",
        headSha: "a".repeat(40),
        workflowRun: "https://example.test/actions/1",
      },
    },
  };
  assert.ok(
    validateCandidateManifest(candidate, {
      config,
      expectedSourceRevision: "f".repeat(40),
    }).includes("sourceRevision does not match the requested commit"),
  );
});
