import assert from "node:assert/strict";
import test from "node:test";

import {
  loadAndValidateRulesetContract,
  validateRulesetContract,
  withOptionalGreptile,
} from "./ruleset-contract.mjs";

test("repository rulesets match the authoritative check contract", () => {
  assert.deepEqual(loadAndValidateRulesetContract().errors, []);
});

test("contract rejects always() and missing required contexts", () => {
  const requiredCheckNames = ["Architecture invariants", "Security gates"];
  const status = (contexts) => ({
    rules: [{
      type: "required_status_checks",
      parameters: { required_status_checks: contexts.map((context) => ({ context })) },
    }],
  });
  const errors = validateRulesetContract({
    config: { requiredCheckNames },
    workflowText: "    name: Architecture invariants\n    name: Security gates\n    if: always()\n",
    staging: status(["Architecture invariants"]),
    main: status(requiredCheckNames),
  });
  assert.ok(errors.some((error) => error.includes("always()")));
  assert.ok(errors.some((error) => error.startsWith("staging required")));
  assert.ok(errors.some((error) => error.includes("build-and-test job")));
});

test("Build and test must depend on every upstream required gate", () => {
  const contexts = [
    "Architecture invariants",
    "Lint and typecheck",
    "Security gates",
    "Build and test",
  ];
  const ruleset = {
    rules: [{
      type: "required_status_checks",
      parameters: { required_status_checks: contexts.map((context) => ({ context })) },
    }],
  };
  const workflowText = `jobs:
  architecture:
    name: Architecture invariants
  lint:
    name: Lint and typecheck
  security:
    name: Security gates
  build-and-test:
    name: Build and test
    needs:
      - architecture
      - security
`;
  const errors = validateRulesetContract({
    config: { requiredCheckNames: contexts },
    workflowText,
    staging: ruleset,
    main: ruleset,
  });
  assert.ok(errors.includes("Build and test must depend on lint"));
});

test("Greptile is opt-in and does not mutate the stored ruleset", () => {
  const source = {
    rules: [{
      type: "required_status_checks",
      parameters: { required_status_checks: [{ context: "Build and test" }] },
    }],
  };
  const strict = withOptionalGreptile(source, true);
  assert.equal(source.rules[0].parameters.required_status_checks.length, 1);
  assert.equal(strict.rules[0].parameters.required_status_checks.at(-1).context, "Greptile Review");
});
