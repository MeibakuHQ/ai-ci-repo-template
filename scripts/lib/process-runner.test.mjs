import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  findRepositoryRoot,
  requireSuccess,
  runExecutable,
} from "./process-runner.mjs";

test("findRepositoryRoot walks up from nested files", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "template-root-"));
  try {
    writeFileSync(path.join(root, "package.json"), "{}\n");
    writeFileSync(path.join(root, "AGENTS.md"), "# test\n");
    const nested = path.join(root, "scripts", "nested");
    mkdirSync(nested, { recursive: true });
    const file = path.join(nested, "tool.mjs");
    writeFileSync(file, "// fixture\n");
    assert.equal(findRepositoryRoot(file), root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("runExecutable passes metacharacters as inert arguments", () => {
  const payload = "value;$(not-a-command)&still-an-argument";
  const result = runExecutable(
    process.execPath,
    ["-e", "process.stdout.write(process.argv[1])", payload],
    { encoding: "utf8", stdio: "pipe" },
  );
  requireSuccess(result, "argument probe");
  assert.equal(result.stdout, payload);
});

test("requireSuccess rejects non-zero exits", () => {
  assert.throws(
    () => requireSuccess({ status: 2 }, "fixture"),
    /fixture failed with exit code 2/,
  );
});
