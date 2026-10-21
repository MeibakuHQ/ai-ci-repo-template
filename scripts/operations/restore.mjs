#!/usr/bin/env node
/**
 * Restore interface stub. Defaults to --dry-run. Real restores require
 * --confirm-empty-targets and must follow docs/operations/recovery-sequence.json.
 */
const dryRun = !process.argv.includes("--execute");
const confirmed = process.argv.includes("--confirm-empty-targets");

if (!dryRun && !confirmed) {
  console.error("restore: refusing --execute without --confirm-empty-targets");
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      action: "restore",
      dryRun,
      confirmedEmptyTargets: confirmed,
      note: dryRun
        ? "pass --execute --confirm-empty-targets only on verified empty targets"
        : "execute acknowledged — implement ordered restore here",
    },
    null,
    2,
  ),
);
