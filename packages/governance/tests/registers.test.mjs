import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  assessContinuity,
  validateContinuityRegister,
  validateDrillCatalog,
  validateInvariantProfiles,
  validateFactAuthorityMap,
  validateRecoverySequence,
  validateServiceCatalog,
  evaluateWorkspaceDependencies,
} from "../src/index.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function readJson(relative) {
  return JSON.parse(readFileSync(path.join(root, relative), "utf8"));
}

test("authority-map validates", () => {
  assert.deepEqual(validateFactAuthorityMap(readJson("docs/governance/authority-map.json")), []);
});

test("service catalog and recovery sequence validate", () => {
  const catalog = readJson("docs/operations/service-catalog.json");
  assert.deepEqual(validateServiceCatalog(catalog), []);
  const serviceIds = new Set(catalog.services.map((s) => s.id));
  assert.deepEqual(
    validateRecoverySequence(readJson("docs/operations/recovery-sequence.json"), {
      serviceIds,
    }),
    [],
  );
});

test("continuity register validates and principal-absence is at-risk", () => {
  const register = readJson("docs/operations/continuity-register.json");
  assert.deepEqual(validateContinuityRegister(register), []);
  const [result] = assessContinuity(register, { scenarioId: "principal-absence" });
  assert.equal(result.status, "at-risk");
  assert.ok(result.risks.length > 0);
});

test("drill catalog validates", () => {
  assert.deepEqual(validateDrillCatalog(readJson("docs/governance/drill-catalog.json")), []);
});

test("invariant profiles validate as an intentionally unconfigured scaffold", () => {
  const register = readJson("docs/governance/invariant-profiles.json");
  assert.deepEqual(validateInvariantProfiles(register), []);
  assert.equal(
    validateInvariantProfiles(register, { requireClassified: true }).length,
    4,
  );
});

test("empty dependency policy allows edges", () => {
  const result = evaluateWorkspaceDependencies(
    { parkedPackages: [] },
    [
      { name: "a", dependencies: { b: "1.0.0" } },
      { name: "b", dependencies: {} },
    ],
  );
  assert.equal(result.ok, true);
});
