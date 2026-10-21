import assert from "node:assert/strict";
import test from "node:test";

import {
  createReleaseManifest,
  loadDeploymentConfig,
} from "../../packages/deployment/src/index.js";
import {
  executeDeployment,
  executeRollback,
  loadDeploymentAdapter,
  resolveInsideRepository,
  simulateDeployment,
} from "./runner.mjs";

const loadedConfig = loadDeploymentConfig();
const config = {
  ...loadedConfig,
  scope: "TEST_PRODUCT",
  artifacts: Object.fromEntries(
    Object.entries(loadedConfig.artifacts).map(([key, value]) => [
      key,
      {
        ...value,
        repository: value.repository
          .replace("YOUR_ORG", "example")
          .replace("YOUR_REPO", "product"),
      },
    ]),
  ),
};

function candidate(revision = "a".repeat(40)) {
  const artifacts = Object.fromEntries(
    Object.entries(config.artifacts).map(([key, value]) => [
      key,
      { reference: `${value.repository}@sha256:${"b".repeat(64)}` },
    ]),
  );
  return {
    schemaVersion: 1,
    train: config.train,
    sourceRevision: revision,
    createdAt: "2026-10-10T00:00:00Z",
    artifacts,
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
        headSha: revision,
        workflowRun: "https://example.test/actions/1",
      },
    },
  };
}

function release(id = "release-v1.0.0") {
  return createReleaseManifest(candidate(), {
    releaseId: id,
    approvedAt: "2026-10-10T00:01:00Z",
    workflowRun: "https://example.test/actions/2",
    actorReference: "role://release-operator",
  }, { config });
}

function adapter(overrides = {}) {
  const pass = async (name) => ({ result: "pass", evidence: [`https://evidence.test/${name}`] });
  return {
    validate: () => pass("validate"),
    backup: () => pass("backup"),
    migrate: () => pass("migrate"),
    deploy: () => pass("deploy"),
    readiness: () => pass("readiness"),
    smoke: () => pass("smoke"),
    rollback: () => pass("rollback"),
    ...overrides,
  };
}

const execution = {
  release: release(),
  environment: "staging",
  config,
  workflowRun: "https://example.test/actions/3",
  actor: "role://release-operator",
};

test("repository path resolver rejects absolute paths and traversal", () => {
  assert.throws(() => resolveInsideRepository(process.cwd(), "../outside.json"), /inside/);
  assert.throws(() => resolveInsideRepository(process.cwd(), process.cwd()), /relative/);
});

test("execution refuses an unconfigured product adapter", async () => {
  await assert.rejects(
    loadDeploymentAdapter(process.cwd(), config),
    /DEPLOYMENT_ADAPTER_UNCONFIGURED/,
  );
});

test("simulation validates inputs without a successful terminal state", () => {
  const plan = simulateDeployment({ mode: "deploy", release: execution.release, environment: "staging", config });
  assert.equal(plan.simulation, true);
  assert.equal(plan.terminalState, null);
  assert.equal(plan.mutationAttempted, false);
});

test("passing adapter evidence reaches succeeded", async () => {
  const result = await executeDeployment({ ...execution, adapter: adapter() });
  assert.equal(result.ok, true);
  assert.equal(result.record.state, "succeeded");
  assert.doesNotMatch(JSON.stringify(result.record), /stub:\/\//);
});

test("failed adapter evidence terminates without success", async () => {
  const result = await executeDeployment({
    ...execution,
    adapter: adapter({
      backup: async () => ({ result: "fail", evidence: ["https://evidence.test/backup-failed"] }),
    }),
  });
  assert.equal(result.ok, false);
  assert.equal(result.record.state, "failed");
});

test("rollback rejects a target that is not a migration predecessor", async () => {
  const targetCandidate = candidate("f".repeat(40));
  targetCandidate.migrations.api.entries.push({
    id: "002",
    sha256: "1".repeat(64),
    previousApplicationCompatibility: "compatible",
  });
  targetCandidate.migrations.api.latest = "002";
  const target = createReleaseManifest(targetCandidate, {
    releaseId: "release-v2.0.0",
    approvedAt: "2026-10-10T00:02:00Z",
    workflowRun: "https://example.test/actions/4",
    actorReference: "role://release-operator",
  }, { config });
  await assert.rejects(
    executeRollback({
      currentRelease: execution.release,
      targetRelease: target,
      environment: "staging",
      config,
      adapter: adapter(),
      workflowRun: execution.workflowRun,
      actor: execution.actor,
    }),
    /ROLLBACK_INCOMPATIBLE/,
  );
});
