import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { analyzeRepository } from "../src/analyzer.js";

test("flags missing launch basics", () => {
  const repoPath = makeFixture("bare");
  writeFileSync(path.join(repoPath, "package.json"), JSON.stringify({ name: "bare" }));

  const report = analyzeRepository(repoPath);
  const ids = report.findings.map((finding) => finding.id);

  assert.equal(report.grade, "F");
  assert.ok(ids.includes("readme.missing"));
  assert.ok(ids.includes("trust.license-missing"));
});

test("rewards a repo with launch signals", () => {
  const repoPath = makeFixture("ready");
  mkdirSync(path.join(repoPath, ".github", "workflows"), { recursive: true });
  mkdirSync(path.join(repoPath, ".github", "ISSUE_TEMPLATE"), { recursive: true });
  writeFileSync(path.join(repoPath, "LICENSE"), "MIT");
  writeFileSync(path.join(repoPath, "CONTRIBUTING.md"), "Run npm test before opening a pull request.");
  writeFileSync(path.join(repoPath, "CODE_OF_CONDUCT.md"), "Be kind.");
  writeFileSync(path.join(repoPath, "SECURITY.md"), "Report issues privately.");
  writeFileSync(path.join(repoPath, ".github", "workflows", "ci.yml"), "name: CI");
  writeFileSync(path.join(repoPath, "package.json"), JSON.stringify({
    name: "ready",
    bin: { ready: "./dist/cli.js" },
    scripts: {
      build: "tsc",
      test: "node --test",
      lint: "eslint ."
    }
  }));
  writeFileSync(path.join(repoPath, "README.md"), `# Ready

Ready helps maintainers make their repositories easier to try and contribute to.

![Demo](demo.gif)

## Quickstart

\`\`\`bash
npx ready .
\`\`\`

## Install

\`\`\`bash
npm install -g ready
\`\`\`

## Usage

Run it against a local repository and read the actionable report. The output explains launch readiness, trust signals, contribution experience, and obvious setup blockers in plain English.

## Why

Open source maintainers often lose potential users because the project looks unfinished even when the code is useful. This tool focuses on first impressions and practical fixes.
`);

  const report = analyzeRepository(repoPath);

  assert.ok(report.score > 0);
  assert.ok(["A", "B", "C"].includes(report.grade));
});

function makeFixture(name: string): string {
  const repoPath = path.join(tmpdir(), `repo-roast-${name}-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  mkdirSync(repoPath, { recursive: true });
  return repoPath;
}
