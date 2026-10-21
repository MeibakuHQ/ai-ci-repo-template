#!/usr/bin/env node
/**
 * Safe cross-platform process execution and repository-root discovery.
 * Commands receive argument arrays directly; shell concatenation is forbidden.
 */
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

function asPath(value) {
  if (value instanceof URL) return fileURLToPath(value);
  if (typeof value === "string" && value.startsWith("file:")) {
    return fileURLToPath(value);
  }
  return path.resolve(String(value));
}

/** Finds the nearest ancestor containing both package.json and AGENTS.md. */
export function findRepositoryRoot(start = import.meta.url) {
  const resolved = asPath(start);
  let current = existsSync(resolved) && statSync(resolved).isDirectory()
    ? resolved
    : path.dirname(resolved);

  while (true) {
    if (
      existsSync(path.join(current, "package.json")) &&
      existsSync(path.join(current, "AGENTS.md"))
    ) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  throw new Error(`Unable to find repository root from ${resolved}`);
}

/** Executes a binary without a command shell and returns spawnSync evidence. */
export function runExecutable(command, args = [], options = {}) {
  if (!command || !Array.isArray(args)) {
    throw new TypeError("runExecutable requires a command and argument array");
  }
  return spawnSync(command, args, {
    cwd: options.cwd,
    env: options.env ?? process.env,
    encoding: options.encoding,
    input: options.input,
    stdio: options.stdio ?? "inherit",
    shell: false,
  });
}

/** Invokes the active npm/pnpm CLI through Node, avoiding Windows .cmd shells. */
export function runPackageScript(script, args = [], options = {}) {
  const env = options.env ?? process.env;
  const packageManagerCli = env.npm_execpath;
  if (!packageManagerCli) {
    throw new Error(
      "npm_execpath is unavailable; run this command through npm or pnpm",
    );
  }
  return runExecutable(
    process.execPath,
    [packageManagerCli, "run", script, ...args],
    { ...options, env },
  );
}

/** Throws with a concise label when a child process does not exit successfully. */
export function requireSuccess(result, label) {
  if (result.error) throw result.error;
  if ((result.status ?? 1) !== 0) {
    throw new Error(`${label} failed with exit code ${result.status ?? "unknown"}`);
  }
  return result;
}
