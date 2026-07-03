#!/usr/bin/env node
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { analyzeRepository } from "./analyzer.js";
import { formatReport } from "./format.js";
import type { CliOptions } from "./types.js";

const HELP = `Repo Roast

Usage:
  repo-roast [path] [--json] [--no-color]

Examples:
  repo-roast .
  repo-roast ../my-library
  repo-roast . --json
`;

main();

function main(): void {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    console.log(HELP);
    return;
  }

  const options: CliOptions = {
    json: args.includes("--json"),
    color: !args.includes("--no-color") && process.stdout.isTTY
  };

  const target = args.find((arg) => !arg.startsWith("-")) ?? ".";
  const repoPath = path.resolve(process.cwd(), target);

  if (!existsSync(repoPath) || !statSync(repoPath).isDirectory()) {
    console.error(`Repo Roast could not find a directory at: ${repoPath}`);
    process.exitCode = 1;
    return;
  }

  try {
    const report = analyzeRepository(repoPath);
    console.log(formatReport(report, options));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Repo Roast failed: ${message}`);
    process.exitCode = 1;
  }
}
