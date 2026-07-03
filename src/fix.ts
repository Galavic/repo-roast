import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { findFiles, findFirstFile, readTextIfExists } from "./fs-utils.js";

export interface FixOptions {
  dryRun: boolean;
}

export interface FixChange {
  path: string;
  status: "created" | "would-create" | "skipped";
  reason?: string;
}

export interface FixReport {
  repoPath: string;
  changes: FixChange[];
}

const ENV_PATTERNS = [
  /process\.env\.([A-Z0-9_]+)/gi,
  /process\.env\[['"`]([A-Z0-9_]+)['"`]\]/gi,
  /import\.meta\.env\.([A-Z0-9_]+)/gi,
  /Deno\.env\.get\(['"`]([A-Z0-9_]+)['"`]\)/gi,
  /os\.getenv\(['"`]([A-Z0-9_]+)['"`]\)/gi,
  /std::env::(?:var|vars)\(['"`]([A-Z0-9_]+)['"`]\)/gi
];

export function fixRepository(repoPath: string, options: FixOptions): FixReport {
  const absoluteRepoPath = path.resolve(repoPath);
  const changes: FixChange[] = [];
  const envNames = extractEnvNames(absoluteRepoPath);

  if (envNames.length > 0 && !findFirstFile(absoluteRepoPath, [".env.example", ".env.sample", "example.env"])) {
    addFile(changes, absoluteRepoPath, ".env.example", envExample(envNames), options);
  }

  if (!findFirstFile(absoluteRepoPath, ["CONTRIBUTING.md", ".github/CONTRIBUTING.md"])) {
    addFile(changes, absoluteRepoPath, "CONTRIBUTING.md", contributing(), options);
  }

  if (!findFirstFile(absoluteRepoPath, ["SECURITY.md", ".github/SECURITY.md"])) {
    addFile(changes, absoluteRepoPath, "SECURITY.md", security(), options);
  }

  if (!hasWorkflow(absoluteRepoPath)) {
    addFile(changes, absoluteRepoPath, ".github/workflows/ci.yml", ciWorkflow(), options);
  }

  if (!existsSync(path.join(absoluteRepoPath, ".github", "ISSUE_TEMPLATE", "bug_report.yml"))) {
    addFile(changes, absoluteRepoPath, ".github/ISSUE_TEMPLATE/bug_report.yml", bugReportTemplate(), options);
  }

  if (!existsSync(path.join(absoluteRepoPath, ".github", "ISSUE_TEMPLATE", "feature_request.yml"))) {
    addFile(changes, absoluteRepoPath, ".github/ISSUE_TEMPLATE/feature_request.yml", featureRequestTemplate(), options);
  }

  if (!findFirstFile(absoluteRepoPath, ["CODE_OF_CONDUCT.md", ".github/CODE_OF_CONDUCT.md"])) {
    addFile(changes, absoluteRepoPath, "CODE_OF_CONDUCT.md", codeOfConduct(), options);
  }

  if (changes.length === 0) {
    changes.push({ path: ".", status: "skipped", reason: "No safe automatic fixes found." });
  }

  return { repoPath: absoluteRepoPath, changes };
}

function addFile(changes: FixChange[], repoPath: string, relativePath: string, content: string, options: FixOptions): void {
  const fullPath = path.join(repoPath, relativePath);

  if (existsSync(fullPath)) {
    changes.push({ path: relativePath, status: "skipped", reason: "File already exists." });
    return;
  }

  if (!options.dryRun) {
    mkdirSync(path.dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, content, "utf8");
  }

  changes.push({ path: relativePath, status: options.dryRun ? "would-create" : "created" });
}

function extractEnvNames(repoPath: string): string[] {
  const files = findFiles(repoPath, (file) => /\.(ts|tsx|js|jsx|mjs|cjs|py|go|rs)$/.test(file));
  const names = new Set<string>();

  for (const file of files) {
    const text = readTextIfExists(repoPath, file);
    if (!text) {
      continue;
    }

    for (const pattern of ENV_PATTERNS) {
      pattern.lastIndex = 0;
      for (let match = pattern.exec(text); match; match = pattern.exec(text)) {
        names.add(match[1].toUpperCase());
      }
    }
  }

  return [...names].sort();
}

function hasWorkflow(repoPath: string): boolean {
  return findFiles(repoPath, (file) => /^\.github\/workflows\/.+\.ya?ml$/.test(file)).length > 0;
}

function envExample(envNames: string[]): string {
  return `${envNames.map((name) => `${name}=`).join("\n")}\n`;
}

function contributing(): string {
  return `# Contributing

Thanks for helping improve this project.

## Setup

\`\`\`bash
npm install
npm run build
npm test
\`\`\`

## Pull requests

- Keep changes focused.
- Add or update tests when behavior changes.
- Run the test suite before opening a pull request.
- Explain the user-facing impact of your change.
`;
}

function security(): string {
  return `# Security Policy

Please do not open public issues for security reports.

Use GitHub private vulnerability reporting if it is enabled, or contact the maintainer privately.
`;
}

function ciWorkflow(): string {
  return `name: CI

on:
  pull_request:
  push:
    branches:
      - main

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install
        run: npm ci

      - name: Build
        run: npm run build --if-present

      - name: Test
        run: npm test --if-present
`;
}

function bugReportTemplate(): string {
  return `name: Bug report
description: Report something that is broken or misleading.
title: "bug: "
labels: ["bug"]
body:
  - type: textarea
    id: what-happened
    attributes:
      label: What happened?
      description: Include what you expected and what happened instead.
    validations:
      required: true
  - type: textarea
    id: reproduce
    attributes:
      label: How can we reproduce it?
      description: Share commands, inputs, or a minimal example.
`;
}

function featureRequestTemplate(): string {
  return `name: Feature request
description: Suggest an improvement.
title: "feat: "
labels: ["enhancement"]
body:
  - type: textarea
    id: problem
    attributes:
      label: Problem
      description: What problem should this solve?
    validations:
      required: true
  - type: textarea
    id: solution
    attributes:
      label: Proposed solution
      description: Describe the behavior you want.
`;
}

function codeOfConduct(): string {
  return `# Code of Conduct

Be respectful, practical, and generous with context.

Disagreement is welcome. Harassment, abuse, and personal attacks are not.
`;
}
