#!/usr/bin/env node
/**
 * HTTP readiness probes from service-catalog.json.
 * Unreachable local URLs are reported but do not fail unless --strict.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const strict = process.argv.includes("--strict");
const catalog = JSON.parse(
  readFileSync(path.join(root, "docs/operations/service-catalog.json"), "utf8"),
);

let failed = 0;
for (const service of catalog.services ?? []) {
  if (!service.readinessUrl) {
    console.log(`⊘ ${service.id}: no readinessUrl`);
    continue;
  }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(service.readinessUrl, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) {
      console.log(`✗ ${service.id}: HTTP ${res.status}`);
      failed += 1;
    } else {
      console.log(`✓ ${service.id}: ok`);
    }
  } catch (error) {
    console.log(
      `⊘ ${service.id}: unreachable (${error instanceof Error ? error.message : error})`,
    );
    if (strict) failed += 1;
  }
}

if (failed > 0) {
  console.error(`ops:health failed (${failed})`);
  process.exit(1);
}
console.log("ops:health ok");
