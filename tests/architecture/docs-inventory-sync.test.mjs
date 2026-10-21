/**
 * Docs inventory sync — fails when docs/engineering/manifest.json lists
 * paths that do not exist. Extend the manifest when adding canonical docs.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

test("engineering manifest lists existing files", async () => {
  const manifestPath = path.join(repoRoot, "docs/engineering/manifest.json");
  assert.equal(existsSync(manifestPath), true, "docs/engineering/manifest.json missing");

  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  assert.ok(Array.isArray(manifest.files), "manifest.files must be an array");
  assert.ok(manifest.files.length > 0, "manifest.files must not be empty");

  const missing = [];
  for (const relative of manifest.files) {
    if (!existsSync(path.join(repoRoot, relative))) missing.push(relative);
  }
  assert.deepEqual(missing, [], `manifest lists missing paths: ${missing.join(", ")}`);
});
