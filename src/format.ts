import type { CliOptions, RoastReport, Severity } from "./types.js";

const COLORS = {
  reset: "\u001b[0m",
  bold: "\u001b[1m",
  dim: "\u001b[2m",
  red: "\u001b[31m",
  yellow: "\u001b[33m",
  green: "\u001b[32m",
  cyan: "\u001b[36m"
};

export function formatReport(report: RoastReport, options: CliOptions): string {
  if (options.json) {
    return JSON.stringify(report, null, 2);
  }

  const color = colorizer(options.color);
  const lines: string[] = [];
  const scoreText = options.color
    ? `${scoreColor(report.score, report.maxScore)}${report.score}/${report.maxScore}${COLORS.reset}`
    : `${report.score}/${report.maxScore}`;

  lines.push(color.bold(`Repo Roast: ${report.repoName}`));
  lines.push(`${color.bold("Star Readiness")} ${scoreText}  Grade: ${report.grade}`);
  lines.push("");

  lines.push(color.bold("Scoreboard"));
  for (const category of report.categories) {
    lines.push(`  ${category.label.padEnd(27)} ${bar(category.score, category.maxScore, options.color)} ${category.score}/${category.maxScore}`);
  }

  if (report.wins.length > 0) {
    lines.push("");
    lines.push(color.bold("Already good"));
    for (const win of report.wins.slice(0, 6)) {
      lines.push(`  ${color.green("+")} ${win}`);
    }
  }

  if (report.findings.length > 0) {
    lines.push("");
    lines.push(color.bold("Roasts"));
    for (const item of report.findings) {
      lines.push(`  ${severityLabel(item.severity, options.color)} ${color.bold(item.title)} (${item.points}/${item.maxPoints})`);
      lines.push(`     ${item.roast}`);
      lines.push(`     ${color.cyan("Fix:")} ${item.fix}`);
    }
  } else {
    lines.push("");
    lines.push(color.green("No roasts. Suspiciously polished. Ship it."));
  }

  lines.push("");
  lines.push(color.dim(`Generated at ${report.generatedAt}`));

  return lines.join("\n");
}

function colorizer(enabled: boolean): Record<"bold" | "dim" | "red" | "yellow" | "green" | "cyan", (text: string) => string> {
  return {
    bold: (text) => enabled ? `${COLORS.bold}${text}${COLORS.reset}` : text,
    dim: (text) => enabled ? `${COLORS.dim}${text}${COLORS.reset}` : text,
    red: (text) => enabled ? `${COLORS.red}${text}${COLORS.reset}` : text,
    yellow: (text) => enabled ? `${COLORS.yellow}${text}${COLORS.reset}` : text,
    green: (text) => enabled ? `${COLORS.green}${text}${COLORS.reset}` : text,
    cyan: (text) => enabled ? `${COLORS.cyan}${text}${COLORS.reset}` : text
  };
}

function scoreColor(score: number, maxScore: number): string {
  const ratio = score / maxScore;
  if (ratio >= 0.8) return COLORS.green;
  if (ratio >= 0.6) return COLORS.yellow;
  return COLORS.red;
}

function severityLabel(severity: Severity, color: boolean): string {
  if (!color) {
    return `[${severity.toUpperCase()}]`;
  }

  if (severity === "fail") {
    return `${COLORS.red}[FAIL]${COLORS.reset}`;
  }

  if (severity === "warn") {
    return `${COLORS.yellow}[WARN]${COLORS.reset}`;
  }

  return `${COLORS.cyan}[INFO]${COLORS.reset}`;
}

function bar(score: number, maxScore: number, color: boolean): string {
  const width = 16;
  const filled = Math.round((score / maxScore) * width);
  const raw = `${"#".repeat(filled)}${"-".repeat(width - filled)}`;

  if (!color) {
    return `[${raw}]`;
  }

  const ratio = score / maxScore;
  const colorCode = ratio >= 0.8 ? COLORS.green : ratio >= 0.6 ? COLORS.yellow : COLORS.red;
  return `[${colorCode}${raw}${COLORS.reset}]`;
}
