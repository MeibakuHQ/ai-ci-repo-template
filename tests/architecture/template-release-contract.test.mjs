import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const read = (relative) => readFileSync(path.join(process.cwd(), relative), "utf8");

test("release workflow binds immutable evidence to staging head", () => {
  const workflow = read(".github/workflows/release.yml");
  assert.match(workflow, /Require staging source/);
  assert.match(workflow, /--expected-source-revision "\$SOURCE_REVISION"/);
  assert.match(workflow, /actions\/upload-artifact@v4/);
  assert.match(workflow, /if-no-files-found: error/);
  assert.doesNotMatch(workflow, /--release-id "\$\{\{ inputs\./);
});

test("deploy and rollback retrieve manifests by run and execute adapters", () => {
  const deploy = read(".github/workflows/deploy.yml");
  const rollback = read(".github/workflows/rollback.yml");
  for (const workflow of [deploy, rollback]) {
    assert.match(workflow, /actions\/download-artifact@v4/);
    assert.match(workflow, /github-token:/);
    assert.match(workflow, /run-id:/);
    assert.match(workflow, /--execute/);
    assert.match(workflow, /if: always\(\)/);
    assert.match(workflow, /if-no-files-found: error/);
    assert.doesNotMatch(workflow, /--release-id "\$\{\{ inputs\./);
  }
  assert.match(rollback, /--current-release-manifest/);
});
