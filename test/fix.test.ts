import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { fixRepository } from "../src/fix.js";

test("dry run reports safe files without writing", () => {
  const repoPath = makeFixture("dry-run");
  writeFileSync(path.join(repoPath, "index.js"), "console.log(process." + "env.OPENAI_API_KEY);");

  const report = fixRepository(repoPath, { dryRun: true });

  assert.ok(report.changes.some((change) => change.path === ".env.example" && change.status === "would-create"));
  assert.equal(existsSync(path.join(repoPath, ".env.example")), false);
});

test("creates launch files without overwriting existing files", () => {
  const repoPath = makeFixture("write");
  writeFileSync(path.join(repoPath, "index.js"), "console.log(process." + "env.OPENAI_API_KEY);");
  writeFileSync(path.join(repoPath, "CONTRIBUTING.md"), "Existing guide");

  const report = fixRepository(repoPath, { dryRun: false });
  const paths = report.changes.map((change) => change.path);

  assert.ok(paths.includes(".env.example"));
  assert.ok(paths.includes("SECURITY.md"));
  assert.ok(paths.includes(".github/workflows/ci.yml"));
  assert.equal(readFileSync(path.join(repoPath, ".env.example"), "utf8"), "OPENAI_API_KEY=\n");
  assert.equal(readFileSync(path.join(repoPath, "CONTRIBUTING.md"), "utf8"), "Existing guide");
});

function makeFixture(name: string): string {
  const repoPath = path.join(tmpdir(), `repo-roast-fix-${name}-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  mkdirSync(repoPath, { recursive: true });
  return repoPath;
}
