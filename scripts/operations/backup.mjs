#!/usr/bin/env node
/**
 * Backup interface stub. Defaults to --dry-run. Product repos replace the body
 * with encrypted datastore backups; never log secret connection strings.
 */
const dryRun = !process.argv.includes("--execute");
const checkpoint = `backup://stub/${new Date().toISOString()}`;

console.log(
  JSON.stringify(
    {
      action: "backup",
      dryRun,
      checkpoint,
      note: dryRun
        ? "pass --execute only after wiring real backup targets"
        : "execute acknowledged — implement provider-specific backup here",
    },
    null,
    2,
  ),
);
