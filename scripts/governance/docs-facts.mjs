#!/usr/bin/env node
/**
 * Light docs-facts projector: keeps generated Markdown sections in sync with
 * package.json authorities named in docs/governance/authority-map.json.
 *
 *   node scripts/governance/docs-facts.mjs generate
 *   node scripts/governance/docs-facts.mjs check
 *
 * Do not hand-edit content between <!-- facts:start id --> and <!-- facts:end id -->.
 */
import { readFile, writeFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const GENERATED_FACTS_PATH = "docs/governance/generated-facts.md";

/** Replaces one compiler-owned Markdown section; rejects missing or duplicate markers. */
export function replaceGeneratedSection(markdown, projectionId, body) {
  const start = `<!-- facts:start ${projectionId} -->`;
  const end = `<!-- facts:end ${projectionId} -->`;
  const first = markdown.indexOf(start);
  const last = markdown.indexOf(end);
  if (first < 0 || last < first) {
    throw new Error(`missing generated section ${projectionId}`);
  }
  if (
    markdown.indexOf(start, first + start.length) >= 0 ||
    markdown.indexOf(end, last + end.length) >= 0
  ) {
    throw new Error(`duplicate generated section ${projectionId}`);
  }
  const section = `${start}\n${body.trim()}\n${end}`;
  return `${markdown.slice(0, first)}${section}${markdown.slice(last + end.length)}`;
}

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(repoRoot, relativePath), "utf8"));
}

async function pathExists(relativePath) {
  try {
    await stat(path.join(repoRoot, relativePath));
    return true;
  } catch {
    return false;
  }
}

/** Expands npm/pnpm workspace globs into concrete workspace paths with package names. */
async function loadWorkspaces(rootPackage) {
  const patterns = rootPackage.workspaces ?? [];
  const paths = [];
  for (const pattern of patterns) {
    if (!pattern.endsWith("/*")) {
      paths.push(pattern);
      continue;
    }
    const parent = pattern.slice(0, -2);
    if (!(await pathExists(parent))) continue;
    const entries = await readdir(path.join(repoRoot, parent), {
      withFileTypes: true,
    });
    for (const entry of entries) {
      if (
        entry.isDirectory() &&
        (await pathExists(`${parent}/${entry.name}/package.json`))
      ) {
        paths.push(`${parent}/${entry.name}`);
      }
    }
  }
  const workspaces = [];
  for (const workspacePath of [...new Set(paths)].sort()) {
    if (!(await pathExists(`${workspacePath}/package.json`))) continue;
    const manifest = await readJson(`${workspacePath}/package.json`);
    workspaces.push({
      path: workspacePath,
      name: manifest.name ?? workspacePath,
      private: manifest.private === true,
    });
  }
  return workspaces;
}

function markdownTable(headers, rows) {
  const escape = (value) =>
    String(value ?? "—").replaceAll("|", "\\|").replace(/\r?\n/g, " ");
  const head = `| ${headers.map(escape).join(" | ")} |`;
  const sep = `| ${headers.map(() => "---").join(" | ")} |`;
  const body = rows.map((row) => `| ${row.map(escape).join(" | ")} |`).join("\n");
  return [head, sep, body].filter(Boolean).join("\n");
}

async function projectWorkspaceCatalog(rootPackage) {
  const workspaces = await loadWorkspaces(rootPackage);
  if (workspaces.length === 0) {
    return [
      "_No workspaces declared yet. Add `workspaces` to root `package.json` when you create apps/packages._",
      "",
      markdownTable(
        ["path", "name", "private"],
        [[rootPackage.name ?? "(root)", "(root package)", "true"]],
      ),
    ].join("\n");
  }
  return markdownTable(
    ["path", "name", "private"],
    workspaces.map((w) => [w.path, w.name, String(w.private)]),
  );
}

function projectCommandCatalog(rootPackage) {
  const scripts = rootPackage.scripts ?? {};
  const rows = Object.keys(scripts)
    .sort()
    .map((name) => [name, scripts[name]]);
  if (rows.length === 0) {
    return "_No root scripts declared._";
  }
  return markdownTable(["script", "command"], rows);
}

async function buildProjections(rootPackage) {
  return {
    "workspace-catalog": await projectWorkspaceCatalog(rootPackage),
    "command-catalog": projectCommandCatalog(rootPackage),
  };
}

async function applyProjections(markdown, projections) {
  let next = markdown;
  for (const [id, body] of Object.entries(projections)) {
    next = replaceGeneratedSection(next, id, body);
  }
  return next;
}

async function generate() {
  const rootPackage = await readJson("package.json");
  const projections = await buildProjections(rootPackage);
  const current = await readFile(path.join(repoRoot, GENERATED_FACTS_PATH), "utf8");
  const next = await applyProjections(current, projections);
  await writeFile(path.join(repoRoot, GENERATED_FACTS_PATH), next, "utf8");
  console.log(`docs-facts: wrote ${GENERATED_FACTS_PATH}`);
}

async function check() {
  const rootPackage = await readJson("package.json");
  const projections = await buildProjections(rootPackage);
  const current = await readFile(path.join(repoRoot, GENERATED_FACTS_PATH), "utf8");
  const expected = await applyProjections(current, projections);
  if (current !== expected) {
    console.error(
      `docs-facts: ${GENERATED_FACTS_PATH} is out of date. Run: npm run docs:facts:generate`,
    );
    process.exitCode = 1;
    return;
  }
  console.log("docs-facts: ok");
}

const cmd = process.argv[2] ?? "check";
if (cmd === "generate") {
  await generate();
} else if (cmd === "check") {
  await check();
} else {
  console.error(`usage: docs-facts.mjs <generate|check>`);
  process.exitCode = 1;
}
