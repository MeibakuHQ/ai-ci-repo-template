import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

/**
 * Replace with real domain boundary checks for your monorepo.
 * Example: a UI app must not import a billing package; apps import shared via package name only.
 */
describe("architecture placeholder", () => {
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
});
