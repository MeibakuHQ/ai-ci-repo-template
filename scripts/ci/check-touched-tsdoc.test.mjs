import assert from "node:assert/strict";
import test from "node:test";

import {
  checkSource,
  findTsdocAbove,
  loadTypescript,
  missingTypescriptExitCode,
  parseAddedLineNumbers,
  resolveBase,
} from "./check-touched-tsdoc.mjs";

const ts = loadTypescript();
const ast = ts ? test : test.skip;

test("parseAddedLineNumbers returns only current added lines", () => {
  const diff = [
    "@@ -10,0 +11,2 @@",
    "+first",
    "+second",
    "@@ -20 +22 @@",
    "-before",
    "+after",
    "@@ -30 +31,0 @@",
    "-deleted",
  ].join("\n");

  assert.deepEqual([...parseAddedLineNumbers(diff)], [11, 12, 22]);
});

test("resolveBase prefers --base then env", () => {
  assert.equal(resolveBase(["--base", "origin/staging"], {}), "origin/staging");
  assert.equal(
    resolveBase([], { TOUCHED_TSDOC_BASE: " abc " }),
    "abc",
  );
  assert.equal(
    resolveBase([], {
      GITHUB_BASE_REF: "main",
      GITHUB_EVENT_NAME: "pull_request",
    }),
    "origin/main",
  );
  assert.equal(resolveBase([], {}), null);
});

test("enabled TSDoc gate fails when TypeScript is unavailable", () => {
  assert.equal(missingTypescriptExitCode(["--require-typescript"]), 1);
  assert.equal(missingTypescriptExitCode([]), 0);
});

test("findTsdocAbove associates documentation through single and multiline decorators", () => {
  const single = [
    "/** Owns token verification. */",
    "@Injectable()",
    "export class AuthService {}",
  ];
  assert.deepEqual(findTsdocAbove(single, 2), { ok: true });

  const multiline = [
    "/** Exposes the authenticated API. */",
    "@Controller({",
    '  path: "api",',
    "})",
    "@UseGuards(AuthGuard)",
    "export class ApiController {}",
  ];
  assert.deepEqual(findTsdocAbove(multiline, 5), { ok: true });
});

ast("checkSource recognizes modified classes and function-like const exports", () => {
  const source = [
    "export default abstract class Store {}",
    "export const normalize = value => value.trim();",
    "export const format = (value: number): string => String(value);",
    "export const RETRIES = 3;",
  ].join("\n");

  assert.deepEqual(checkSource("service.ts", source, new Set([1, 2, 3, 4]), ts), [
    {
      file: "service.ts",
      line: 1,
      name: "Store",
      kind: "class",
      reason: "missing TSDoc",
    },
    {
      file: "service.ts",
      line: 2,
      name: "normalize",
      kind: "const-fn",
      reason: "missing TSDoc",
    },
    {
      file: "service.ts",
      line: 3,
      name: "format",
      kind: "const-fn",
      reason: "missing TSDoc",
    },
  ]);
});

ast("checkSource ignores untouched legacy exports and checks changed declarations", () => {
  const source = [
    "export function legacy() {}",
    "",
    "/** Normalizes labels without changing stored values. */",
    "export const normalize = value => value.trim();",
    "",
    "export abstract class ChangedService {}",
  ].join("\n");

  const result = checkSource("example.ts", source, new Set([2, 4, 6]), ts);
  assert.deepEqual(result, [
    {
      file: "example.ts",
      line: 6,
      name: "ChangedService",
      kind: "class",
      reason: "missing TSDoc",
    },
  ]);
});

ast("checkSource does not treat changed lines before an export as its declaration", () => {
  const source = [
    "const local = true;",
    "",
    "export function legacy() {}",
  ].join("\n");

  assert.deepEqual(checkSource("example.ts", source, new Set([1, 2]), ts), []);
});

ast("checkSource maps continuation-only signature changes to their export", () => {
  const source = [
    "export function updateEntity(",
    "  entityId: string,",
    "  displayName: string,",
    ") {}",
  ].join("\n");

  assert.deepEqual(checkSource("entity.ts", source, new Set([3]), ts), [
    {
      file: "entity.ts",
      line: 1,
      name: "updateEntity",
      kind: "function",
      reason: "missing TSDoc",
    },
  ]);
});

ast("checkSource ignores body-only changes to legacy functions", () => {
  const source = [
    "export function legacy() {",
    "  return 'changed implementation';",
    "}",
  ].join("\n");

  assert.deepEqual(checkSource("legacy.ts", source, new Set([2]), ts), []);
});

ast("checkSource retains outer generic-arrow signatures through callback types", () => {
  const source = [
    "export const map = <T, U>(",
    "  values: T[],",
    "  mapper: (value: T) => U,",
    "): U[] => values.map(mapper);",
  ].join("\n");

  assert.equal(
    checkSource("map.ts", source, new Set([4]), ts)[0]?.name,
    "map",
  );
});

ast("Next.js default route exports remain exempt", () => {
  assert.deepEqual(
    checkSource("page.tsx", "export default function Page() {}", new Set([1]), ts),
    [],
  );
});
