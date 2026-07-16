#!/usr/bin/env node
/**
 * Run pnpm audit at critical level. If the npm registry returns 410 for the
 * legacy audit endpoint (retired), skip with a warning — secret-scan remains
 * the hard gate. Fail on real critical advisories when audit succeeds.
 */
import { spawnSync } from "node:child_process";

const result = spawnSync("pnpm", ["audit", "--audit-level=critical"], {
  encoding: "utf8",
  shell: process.platform === "win32",
});

const out = `${result.stdout ?? ""}${result.stderr ?? ""}`;
process.stdout.write(result.stdout ?? "");
process.stderr.write(result.stderr ?? "");

if (
  /ERR_PNPM_AUDIT_BAD_RESPONSE/.test(out) ||
  /responded with 410/.test(out) ||
  /endpoint .* being retired/i.test(out)
) {
  console.warn(
    "pnpm audit: registry legacy audit endpoint unavailable (410). Skipping advisory gate; secret-scan still applies.",
  );
  process.exit(0);
}

process.exit(result.status ?? 1);
