#!/usr/bin/env node
/**
 * Drive the deployment state machine in stub mode (validate + log; no cluster).
 *
 *   node scripts/deploy/deploy.mjs --mode deploy --environment staging --dry-run
 *   node scripts/deploy/deploy.mjs --mode rollback --environment staging --dry-run
 */
import {
  canTransition,
  createDeploymentRecord,
  decideRecovery,
  loadDeploymentConfig,
  transitionDeployment,
} from "../../packages/deployment/src/index.js";

function argValue(flag) {
  const idx = process.argv.indexOf(flag);
  return idx >= 0 ? process.argv[idx + 1] : null;
}

const config = loadDeploymentConfig();
const mode = argValue("--mode") ?? "deploy";
const environment = argValue("--environment") ?? "staging";
const dryRun = !process.argv.includes("--execute");

if (!(config.environments ?? []).includes(environment)) {
  console.error(`unknown environment: ${environment}`);
  process.exit(1);
}

const releaseId = argValue("--release-id") ?? "release-v0.0.0-stub";
const now = new Date().toISOString();

function transition(state, reasonCode) {
  return {
    state,
    timestamp: now,
    workflowRun: argValue("--workflow-run") ?? "local://deploy-stub",
    reasonCode,
    entryConditions: [{ id: "precheck", result: "pass" }],
    successConditions: [{ id: "step", result: "pass" }],
    evidence: [`stub://${state}`],
  };
}

console.log(
  JSON.stringify(
    {
      mode,
      environment,
      dryRun,
      composePath: config.composePath,
      artifacts: Object.keys(config.artifacts ?? {}),
    },
    null,
    2,
  ),
);

if (mode === "recover") {
  const decision = decideRecovery({
    mutationStarted: process.argv.includes("--mutation-started"),
    migrationTransactionRolledBack: process.argv.includes("--migration-rolled-back"),
    previousApplicationCompatible: process.argv.includes("--compatible"),
    dataIntegrityCertain: !process.argv.includes("--integrity-uncertain"),
    recoveryChecksPass: process.argv.includes("--recovery-checks-pass"),
    knownGoodAvailable: process.argv.includes("--known-good"),
  });
  console.log("recovery:", decision);
  process.exit(0);
}

let record = createDeploymentRecord(
  {
    schemaVersion: 1,
    deploymentId: `deploy://${environment}/${Date.now()}`,
    releaseId,
    releaseManifestSha256: "b".repeat(64),
    configurationVersion: `${environment}-stub`,
    environment,
    targetId: `target://${environment}`,
    requestedBy: "role://release-operator",
  },
  transition("requested", "operator-request"),
  { config },
);

const pathStates =
  mode === "rollback"
    ? ["validated", "approved", "rollback-started", "rolled-back"]
    : [
        "validated",
        "approved",
        "backup-created",
        "migrations-started",
        "migrations-completed",
        "services-deploying",
        "readiness-checking",
        "smoke-testing",
        "succeeded",
      ];

for (const state of pathStates) {
  if (!canTransition(record.state, state)) {
    console.error(`illegal: ${record.state} -> ${state}`);
    process.exit(1);
  }
  record = transitionDeployment(record, transition(state, state));
  console.log(`→ ${state}`);
}

if (dryRun) {
  console.log("deploy: dry-run complete (pass --execute only after wiring a real target)");
} else {
  console.log(
    "deploy: --execute acknowledged; compose/cluster hooks are still stubs — wire them before production use",
  );
}

console.log(`final state: ${record.state}`);
