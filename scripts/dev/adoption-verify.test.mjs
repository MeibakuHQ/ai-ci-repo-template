import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { assessAdoption, validateTemplateSelfCheck } from "./adoption-verify.mjs";

function write(root, relative, value) {
  const absolute = path.join(root, relative);
  mkdirSync(path.dirname(absolute), { recursive: true });
  writeFileSync(absolute, typeof value === "string" ? value : `${JSON.stringify(value, null, 2)}\n`);
}

function classifiedProfiles() {
  const scenarios = ["negative case rejects unsafe behavior"];
  return {
    schemaVersion: 1,
    profiles: [
      "tenant-propagation",
      "durable-acknowledgement",
      "single-source-of-truth",
      "external-authority",
    ].map((id) => ({
      id,
      status: "not-applicable",
      ownerRole: "role://platform-architect",
      rationale: "This fixture has no runtime domain or mutation surface.",
      enforcementTests: [],
      requiredScenarios: scenarios,
    })),
  };
}

test("adoption verifier rejects a partial scaffold", async () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "adoption-partial-"));
  try {
    write(root, "package.json", { name: "product" });
    write(root, "AGENTS.md", "# Product\n");
    write(root, "docs/CONTEXT.md", "Replace this stub with your product language.\n");
    write(root, "docs/operations/deployment-config.json", {
      scope: "YOUR_PRODUCT",
      deploymentAdapterModule: null,
    });
    const errors = await assessAdoption(root);
    assert.ok(errors.some((error) => error.includes("YOUR_*")));
    assert.ok(errors.some((error) => error.includes("product vocabulary")));
    assert.ok(errors.some((error) => error.includes("product boundary test")));
    assert.ok(errors.some((error) => error.includes("service ownership")));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("adoption verifier accepts an explicitly classified product fixture", async () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "adoption-ready-"));
  try {
    write(root, "package.json", { name: "product" });
    write(root, "AGENTS.md", "# Product\n");
    write(root, "docs/CONTEXT.md", "# Domain context\n\n| Term | Meaning |\n| --- | --- |\n| Order | Durable work request |\n");
    write(
      root,
      "scripts/deploy/product-adapter.mjs",
      `const pass = async () => ({ result: "pass", evidence: ["artifact://deployment/evidence"] });
export default {
  validate: pass,
  backup: pass,
  migrate: pass,
  deploy: pass,
  readiness: pass,
  smoke: pass,
  rollback: pass,
};
`,
    );
    write(root, "tests/architecture/product-boundary.test.mjs", "// product boundary\n");
    write(root, "docs/operations/service-catalog.json", {
      schemaVersion: 1,
      scope: "PRODUCT",
      services: [{ id: "orders", ownerRole: "role://orders-operations" }],
    });
    write(root, "docs/governance/invariant-profiles.json", classifiedProfiles());
    write(root, "docs/operations/deployment-config.json", {
      scope: "PRODUCT",
      deploymentAdapterModule: "scripts/deploy/product-adapter.mjs",
      invariantProfilesPath: "docs/governance/invariant-profiles.json",
    });
    assert.deepEqual(await assessAdoption(root), []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("adoption verifier rejects an adapter that lacks executable operations", async () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "adoption-invalid-adapter-"));
  try {
    write(root, "package.json", { name: "product" });
    write(root, "AGENTS.md", "# Product\n");
    write(root, "docs/CONTEXT.md", "# Domain context\n\n| Term | Meaning |\n| --- | --- |\n| Order | Durable request |\n");
    write(root, "scripts/deploy/product-adapter.mjs", "export default {};\n");
    write(root, "tests/architecture/product-boundary.test.mjs", "// product boundary\n");
    write(root, "docs/operations/service-catalog.json", {
      schemaVersion: 1,
      scope: "PRODUCT",
      services: [{ id: "orders", ownerRole: "role://orders-operations" }],
    });
    write(root, "docs/governance/invariant-profiles.json", classifiedProfiles());
    write(root, "docs/operations/deployment-config.json", {
      scope: "PRODUCT",
      deploymentAdapterModule: "scripts/deploy/product-adapter.mjs",
      invariantProfilesPath: "docs/governance/invariant-profiles.json",
    });
    const errors = await assessAdoption(root);
    assert.ok(errors.some((error) => error.includes("configured deployment adapter is invalid")));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("template bypass is bound to canonical package and remote", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "adoption-identity-"));
  try {
    write(root, "package.json", { name: "product" });
    assert.deepEqual(validateTemplateSelfCheck(root), [
      "template self-check requires the canonical package name",
    ]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
