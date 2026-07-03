#!/usr/bin/env node
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { analyzeRepository } from "./analyzer.js";
import { fixRepository } from "./fix.js";
import { formatReport } from "./format.js";
import type { CliOptions } from "./types.js";

const HELP = `Repo Roast

Usage:
  repo-roast [path] [--json] [--no-color]
  repo-roast fix [path] [--dry-run] [--no-color]

Examples:
  repo-roast .
  repo-roast ../my-library
  repo-roast . --json
  repo-roast fix .
  repo-roast fix . --dry-run
`;

main();

function main(): void {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    console.log(HELP);
    return;
  }

  const command = args[0] === "fix" ? "fix" : "roast";
  const commandArgs = command === "fix" ? args.slice(1) : args;
  const options: CliOptions = {
    json: commandArgs.includes("--json"),
    color: !commandArgs.includes("--no-color") && process.stdout.isTTY
  };

  const target = commandArgs.find((arg) => !arg.startsWith("-")) ?? ".";
  const repoPath = path.resolve(process.cwd(), target);

  if (!existsSync(repoPath) || !statSync(repoPath).isDirectory()) {
    console.error(`Repo Roast could not find a directory at: ${repoPath}`);
    process.exitCode = 1;
    return;
  }

  try {
    if (command === "fix") {
      const report = fixRepository(repoPath, { dryRun: commandArgs.includes("--dry-run") });
      console.log(formatFixReport(report, options.color));
      return;
    }

    const report = analyzeRepository(repoPath);
    console.log(formatReport(report, options));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Repo Roast failed: ${message}`);
    process.exitCode = 1;
  }
}

function formatFixReport(report: ReturnType<typeof fixRepository>, color: boolean): string {
  const lines = ["Repo Roast Fix", ""];

  for (const change of report.changes) {
    const mark = change.status === "created" ? "+" : change.status === "would-create" ? "~" : "-";
    const status = change.status === "created" ? "created" : change.status === "would-create" ? "would create" : "skipped";
    lines.push(`${colorize(mark, change.status, color)} ${status.padEnd(12)} ${change.path}${change.reason ? ` (${change.reason})` : ""}`);
  }

  return lines.join("\n");
}

function colorize(text: string, status: "created" | "would-create" | "skipped", color: boolean): string {
  if (!color) {
    return text;
  }

  const code = status === "created" ? "\u001b[32m" : status === "would-create" ? "\u001b[33m" : "\u001b[2m";
  return `${code}${text}\u001b[0m`;
}
