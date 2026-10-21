#!/usr/bin/env node
/**
 * Developer environment doctor: Node version, required files, declared ports.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "node:net";
import { loadDeploymentConfig } from "../../packages/deployment/src/index.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const config = loadDeploymentConfig();
const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));

let failed = 0;

function ok(label) {
  console.log(`✓ ${label}`);
}
function bad(label) {
  console.log(`✗ ${label}`);
  failed += 1;
}

const major = Number(process.versions.node.split(".")[0]);
const engine = String(pkg.engines?.node ?? ">=24");
const minNodeMatch = engine.match(/(\d+)/);
const minNode = Number(minNodeMatch?.[1] ?? 24);
if (major >= minNode) ok(`Node ${process.versions.node} (>=${minNode})`);
else bad(`Node ${process.versions.node} (need >=${minNode})`);

for (const relative of config.requiredFiles ?? []) {
  if (existsSync(path.join(root, relative))) ok(`file ${relative}`);
  else bad(`missing ${relative}`);
}

async function portFree(port) {
  return new Promise((resolve) => {
    const server = createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => server.close(() => resolve(true)));
    server.listen(port, "127.0.0.1");
  });
}

for (const port of config.doctorPorts ?? []) {
  const free = await portFree(port);
  if (free) ok(`port ${port} available`);
  else console.log(`⊘ port ${port} in use (ok if you are already running the stack)`);
}

if (failed > 0) {
  console.error(`dev:doctor failed (${failed})`);
  process.exit(1);
}
console.log("dev:doctor ok");
