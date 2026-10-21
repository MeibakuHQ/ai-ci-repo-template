import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

/**
 * Template architecture gate: agent docs + CI job-name contract.
 * Replace / extend with real domain boundary checks for your monorepo.
 */
describe("architecture scaffold", () => {
  it("AGENTS.md exists at repo root", () => {
    assert.equal(existsSync(join(process.cwd(), "AGENTS.md")), true);
  });

  it("CI workflow declares required job names", () => {
    const ci = readFileSync(
      join(process.cwd(), ".github/workflows/ci.yml"),
      "utf8",
    );
    for (const name of [
      "Architecture invariants",
      "Lint and typecheck",
      "Security gates",
      "Build and test",
    ]) {
      assert.match(ci, new RegExp(`name:\\s*${name}`));
    }
  });

  it("governance authority-map exists", () => {
    assert.equal(
      existsSync(join(process.cwd(), "docs/governance/authority-map.json")),
      true,
    );
  });
});

/**
 * Import-boundary example — enable when apps/ and packages/ exist.
 *
 * Scan TypeScript sources under apps/ for:
 * - relative imports that reach another app (`../other-app` or `apps/`)
 * - relative deep-imports into packages/ (prefer package name imports)
 *
 * Uncomment and adapt once workspaces are present:
 *
 * ```js
 * import { readdirSync, statSync } from "node:fs";
 *
 * function walk(dir, out = []) {
 *   for (const name of readdirSync(dir)) {
 *     const p = join(dir, name);
 *     if (statSync(p).isDirectory()) walk(p, out);
 *     else if (/\.(tsx?|jsx?|mjs)$/.test(name)) out.push(p);
 *   }
 *   return out;
 * }
 *
 * it.skip("apps do not relative-import other apps or deep-import packages", () => {
 *   const appsRoot = join(process.cwd(), "apps");
 *   if (!existsSync(appsRoot)) return;
 *   const importRe = /from\s+['"](\.\.?\/[^'"]+)['"]/g;
 *   const violations = [];
 *   for (const file of walk(appsRoot)) {
 *     const text = readFileSync(file, "utf8");
 *     let m;
 *     while ((m = importRe.exec(text))) {
 *       const spec = m[1].replace(/\\/g, "/");
 *       if (spec.includes("/apps/") || /\/packages\//.test(spec)) {
 *         violations.push(`${file}: ${spec}`);
 *       }
 *     }
 *   }
 *   assert.deepEqual(violations, []);
 * });
 * ```
 */
describe("import boundary (example)", () => {
  it("documents how to enable import scanning", () => {
    assert.equal(typeof describe, "function");
  });
});
