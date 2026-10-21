#!/usr/bin/env node
/**
 * PR-diff TSDoc gate for new or modified exported declarations.
 *
 * Only added lines intersecting AST-derived export signatures are checked, so
 * an unrelated implementation edit cannot make legacy undocumented exports
 * fail. Product repos need `typescript` installed. CI supplies the PR base;
 * local callers should pass:
 *
 *   npm run test:touched-tsdoc -- --base origin/<target-branch>
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const LOOKBACK = 32;

const SKIP_PATH_RE = [
  /(^|\/)node_modules\//,
  /(^|\/)\.next\//,
  /(^|\/)\.turbo\//,
  /(^|\/)dist\//,
  /(^|\/)opensrc\//,
  /\.generated\./,
  /next-env\.d\.ts$/,
  /\.test\.[jt]sx?$/,
  /\.spec\.[jt]sx?$/,
  /(^|\/)__tests__\//,
];

const NEXT_ROUTE_BASENAMES = new Set([
  "page.tsx",
  "page.ts",
  "layout.tsx",
  "layout.ts",
  "route.ts",
  "route.tsx",
  "loading.tsx",
  "error.tsx",
  "not-found.tsx",
  "template.tsx",
  "default.tsx",
]);

/** Loads the TypeScript compiler API when available (product monorepos). */
export function loadTypescript() {
  try {
    return createRequire(import.meta.url)("typescript");
  } catch {
    return null;
  }
}

/** Returns whether a missing TypeScript compiler must fail this invocation. */
export function missingTypescriptExitCode(argv = process.argv.slice(2)) {
  return argv.includes("--require-typescript") ? 1 : 0;
}

/** Resolves the comparison base from CLI arguments before CI environment fallbacks. */
export function resolveBase(argv = process.argv.slice(2), env = process.env) {
  const baseIdx = argv.indexOf("--base");
  if (baseIdx >= 0 && argv[baseIdx + 1]) return argv[baseIdx + 1];
  if (env.TOUCHED_TSDOC_BASE?.trim()) return env.TOUCHED_TSDOC_BASE.trim();
  if (env.GITHUB_BASE_REF?.trim() && env.GITHUB_EVENT_NAME === "pull_request") {
    return `origin/${env.GITHUB_BASE_REF.trim()}`;
  }
  return null;
}

/** Lists current TypeScript files that are added, copied, modified, or renamed. */
export function listTouchedFiles(base) {
  const out = execFileSync(
    "git",
    ["diff", "--name-only", "-z", "--diff-filter=ACMR", `${base}...HEAD`],
    { encoding: "utf8" },
  );
  return out
    .split("\0")
    .filter(Boolean)
    .filter((file) => /\.(tsx?)$/.test(file))
    .filter(
      (file) => !SKIP_PATH_RE.some((re) => re.test(file.replace(/\\/g, "/"))),
    );
}

/**
 * Parses zero-context diff hunk headers into line numbers on the new side.
 * Deleted-only hunks intentionally add no lines because no current declaration
 * remains for the gate to inspect.
 */
export function parseAddedLineNumbers(diff) {
  const changed = new Set();
  for (const line of diff.split(/\r?\n/)) {
    const match = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/);
    if (!match) continue;
    const start = Number(match[1]);
    const count = match[2] === undefined ? 1 : Number(match[2]);
    for (let offset = 0; offset < count; offset++) changed.add(start + offset);
  }
  return changed;
}

/** Returns added new-side line numbers for one current file. */
export function listChangedLines(base, file) {
  const diff = execFileSync(
    "git",
    ["diff", "--unified=0", "--no-color", `${base}...HEAD`, "--", file],
    { encoding: "utf8" },
  );
  return parseAddedLineNumbers(diff);
}

function delimiterBalance(line) {
  const closing = (line.match(/[)\]}]/g) ?? []).length;
  const opening = (line.match(/[(\[{]/g) ?? []).length;
  return closing - opening;
}

/**
 * Finds the first line of a decorator immediately above an export. Multiline
 * decorators are recognized by balanced delimiters while walking upward.
 */
function decoratorStart(lines, endIndex, floor) {
  const end = lines[endIndex]?.trim() ?? "";
  if (end.startsWith("@")) return endIndex;
  if (!/[)\]}]\s*,?\s*$/.test(end)) return null;

  let balance = 0;
  for (let index = endIndex; index >= floor; index--) {
    const text = lines[index].trim();
    balance += delimiterBalance(text);
    if (text.startsWith("@") && balance <= 0) return index;
  }
  return null;
}

function lineBeforeDecorators(lines, symbolLineIndex) {
  const floor = Math.max(0, symbolLineIndex - LOOKBACK);
  let index = symbolLineIndex - 1;

  while (index >= floor) {
    while (index >= floor && !lines[index].trim()) index--;
    const start = decoratorStart(lines, index, floor);
    if (start === null) break;
    index = start - 1;
  }
  return index;
}

/** Associates a non-empty TSDoc block with an export, through decorators. */
export function findTsdocAbove(lines, symbolLineIndex) {
  const floor = Math.max(0, symbolLineIndex - LOOKBACK);
  let bodyLines = [];
  let inBlock = false;
  let sawOpen = false;

  for (
    let index = lineBeforeDecorators(lines, symbolLineIndex);
    index >= floor;
    index--
  ) {
    const trim = lines[index].trim();
    if (!trim) continue;
    if (trim.startsWith("export ")) break;
    if (trim === "*/") {
      inBlock = true;
      continue;
    }
    if (inBlock) {
      if (trim.startsWith("/**")) {
        sawOpen = true;
        const sameLine = trim
          .replace(/^\/\*\*/, "")
          .replace(/\*\/$/, "")
          .trim();
        if (sameLine && sameLine !== "*") bodyLines.push(sameLine);
        break;
      }
      if (trim.startsWith("*")) {
        const content = trim.replace(/^\*\s?/, "").trim();
        if (content) bodyLines.push(content);
        continue;
      }
      break;
    }
    if (trim.startsWith("/**") && trim.endsWith("*/")) {
      sawOpen = true;
      const inner = trim.slice(3, -2).trim();
      if (inner) bodyLines.push(inner);
      break;
    }
    if (trim.startsWith("//") || trim.startsWith("/*")) continue;
    break;
  }

  if (!sawOpen) return { ok: false, reason: "missing TSDoc" };
  bodyLines = bodyLines.filter((line) => line && !line.startsWith("@"));
  return bodyLines.length > 0
    ? { ok: true }
    : { ok: false, reason: "empty TSDoc" };
}

function modifierOfKind(ts, node, kind) {
  if (!ts.canHaveModifiers(node)) return undefined;
  return ts.getModifiers(node)?.find((modifier) => modifier.kind === kind);
}

function lineNumberAt(sourceFile, position) {
  return sourceFile.getLineAndCharacterOfPosition(position).line + 1;
}

function candidate(ts, sourceFile, node, kind, name, signatureEnd) {
  const exportModifier = modifierOfKind(ts, node, ts.SyntaxKind.ExportKeyword);
  if (!exportModifier) return null;
  return {
    kind,
    name,
    startLine: lineNumberAt(sourceFile, exportModifier.getStart(sourceFile)),
    endLine: lineNumberAt(sourceFile, signatureEnd),
  };
}

/**
 * Uses the TypeScript AST to retain outer signature boundaries through nested
 * generics, callback types, defaults, decorators, and multiline declarations.
 */
export function exportedDeclarationRanges(file, source, ts = loadTypescript()) {
  if (!ts) {
    throw new Error(
      "typescript package required for AST checks (add as a root/devDependency)",
    );
  }
  const sourceFile = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const basename = path.basename(file);
  const ranges = [];

  for (const statement of sourceFile.statements) {
    const exportModifier = modifierOfKind(
      ts,
      statement,
      ts.SyntaxKind.ExportKeyword,
    );
    if (!exportModifier) continue;
    const isDefault = Boolean(
      modifierOfKind(ts, statement, ts.SyntaxKind.DefaultKeyword),
    );
    if (isDefault && NEXT_ROUTE_BASENAMES.has(basename)) continue;

    if (ts.isFunctionDeclaration(statement)) {
      const range = candidate(
        ts,
        sourceFile,
        statement,
        "function",
        statement.name?.text ?? "default",
        statement.body?.getStart(sourceFile) ?? statement.end,
      );
      if (range) ranges.push(range);
      continue;
    }

    if (ts.isClassDeclaration(statement)) {
      const range = candidate(
        ts,
        sourceFile,
        statement,
        "class",
        statement.name?.text ?? "default",
        Math.max(statement.getStart(sourceFile), statement.members.pos - 1),
      );
      if (range) ranges.push(range);
      continue;
    }

    if (
      ts.isTypeAliasDeclaration(statement) ||
      ts.isInterfaceDeclaration(statement)
    ) {
      const range = candidate(
        ts,
        sourceFile,
        statement,
        ts.isTypeAliasDeclaration(statement) ? "type" : "interface",
        statement.name.text,
        statement.end,
      );
      if (range) ranges.push(range);
      continue;
    }

    const isConst =
      ts.isVariableStatement(statement) &&
      Boolean(statement.declarationList.flags & ts.NodeFlags.Const);
    if (!isConst) continue;

    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || !declaration.initializer)
        continue;
      const initializer = declaration.initializer;
      if (
        !ts.isArrowFunction(initializer) &&
        !ts.isFunctionExpression(initializer)
      ) {
        continue;
      }
      const signatureEnd = ts.isArrowFunction(initializer)
        ? initializer.equalsGreaterThanToken.end
        : initializer.body.getStart(sourceFile);
      const range = candidate(
        ts,
        sourceFile,
        statement,
        "const-fn",
        declaration.name.text,
        signatureEnd,
      );
      if (range) ranges.push(range);
    }
  }
  return ranges;
}

/** Checks AST-derived export signature ranges in an in-memory source file. */
export function checkSource(file, source, changedLineNumbers, ts = loadTypescript()) {
  const lines = source.split(/\r?\n/);
  const missing = [];
  const ranges = exportedDeclarationRanges(file, source, ts);

  for (const range of ranges) {
    const declarationChanged = [...changedLineNumbers].some(
      (lineNumber) =>
        lineNumber >= range.startLine && lineNumber <= range.endLine,
    );
    if (!declarationChanged) continue;
    const doc = findTsdocAbove(lines, range.startLine - 1);
    if (!doc.ok) {
      missing.push({
        file,
        line: range.startLine,
        name: range.name,
        kind: range.kind,
        reason: doc.reason ?? "missing TSDoc",
      });
    }
  }
  return missing;
}

/** Reads a current file and checks its changed exported declarations. */
export function checkFile(file, changedLineNumbers) {
  if (!existsSync(file)) return [];
  return checkSource(file, readFileSync(file, "utf8"), changedLineNumbers);
}

function main() {
  const ts = loadTypescript();
  if (!ts) {
    if (missingTypescriptExitCode() === 1) {
      console.error(
        "touched-tsdoc: typescript is required when this gate is enabled",
      );
      return 1;
    }
    console.log(
      "touched-tsdoc: skip (typescript not installed). Add typescript as a root/devDependency in product repos.",
    );
    return 0;
  }

  const base = resolveBase();
  if (!base) {
    console.log(
      "touched-tsdoc: skip (no base). Set TOUCHED_TSDOC_BASE or pass --base <ref>.",
    );
    return 0;
  }

  let files;
  try {
    files = listTouchedFiles(base);
  } catch (error) {
    console.error(`touched-tsdoc: git diff failed against base "${base}"`);
    console.error(error instanceof Error ? error.message : error);
    return 1;
  }

  if (files.length === 0) {
    console.log(`touched-tsdoc: ok (no touched .ts/.tsx vs ${base})`);
    return 0;
  }

  const allMissing = [];
  for (const file of files) {
    allMissing.push(...checkFile(file, listChangedLines(base, file)));
  }

  console.log(`touched-tsdoc: checked ${files.length} file(s) vs ${base}`);
  if (allMissing.length === 0) {
    console.log("touched-tsdoc: ok");
    return 0;
  }

  console.error(`touched-tsdoc: ${allMissing.length} export(s) need TSDoc:\n`);
  for (const missing of allMissing) {
    console.error(
      `  ${missing.file}:${missing.line}  ${missing.kind} ${missing.name} — ${missing.reason}`,
    );
  }
  console.error(
    "\nAdd a short /** intent */ block above each export (see AGENTS.md). Re-run:",
  );
  console.error(`  npm run test:touched-tsdoc -- --base ${base}`);
  return 1;
}

if (
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
) {
  process.exitCode = main();
}
