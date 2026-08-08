/**
 * Soft-run the opensrc CLI when installed; otherwise skip with exit 0.
 */
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";

export function resolveOpensrcBin(root) {
  try {
    const require = createRequire(path.join(root, "package.json"));
    return require.resolve("opensrc/package.json");
  } catch {
    return null;
  }
}

export function runOpensrc(root, args, options = {}) {
  const pkgJson = resolveOpensrcBin(root);
  if (!pkgJson) {
    console.log("opensrc: skip (package not installed)");
    return { status: 0, skipped: true };
  }
  const bin = path.join(path.dirname(pkgJson), "bin", "opensrc.js");
  const result = spawnSync(process.execPath, [bin, ...args], {
    cwd: root,
    stdio: options.stdio ?? "inherit",
    encoding: "utf8",
  });
  return { status: result.status ?? 1, skipped: false, result };
}
