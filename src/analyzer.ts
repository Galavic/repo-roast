import path from "node:path";
import { findFiles, findFirstFile, fileExists, readTextIfExists } from "./fs-utils.js";
import type { Category, CategoryScore, Finding, RoastReport } from "./types.js";

const CATEGORY_LABELS: Record<Category, string> = {
  demoClarity: "Demo clarity",
  setupExperience: "Setup experience",
  trustSignals: "Trust signals",
  contributorFriendliness: "Contributor friendliness"
};

const SECRET_PATTERNS = [
  /(?:api[_-]?key|secret|token|password)\s*=\s*["']?[a-z0-9_\-.]{16,}/i,
  /-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----/,
  /ghp_[a-zA-Z0-9]{20,}/
];

const ENV_ACCESS_PATTERNS = [
  /process\.env(?:\.[A-Z0-9_]+|\[['"`][A-Z0-9_]+['"`]\])/i,
  /import\.meta\.env\.[A-Z0-9_]+/i,
  /Deno\.env\.get\(/,
  /os\.getenv\(/,
  /std::env::(?:var|vars)\(/
];

export function analyzeRepository(repoPath: string): RoastReport {
  const absoluteRepoPath = path.resolve(repoPath);
  const repoName = path.basename(absoluteRepoPath);
  const findings: Finding[] = [];
  const wins: string[] = [];

  const readmePath = findFirstFile(absoluteRepoPath, ["README.md", "readme.md", "README"]);
  const readme = readmePath ? readTextIfExists(absoluteRepoPath, readmePath) : null;
  const packageJson = readPackageJson(absoluteRepoPath);
  const hasGitHubActions = fileExists(absoluteRepoPath, ".github/workflows");
  const sourceFiles = findFiles(absoluteRepoPath, (file) => /\.(ts|tsx|js|jsx|py|go|rs|java|cs|rb|php)$/.test(file));

  checkReadme(findings, wins, readme);
  checkDemo(findings, wins, readme);
  checkInstall(findings, wins, readme, packageJson);
  checkProjectScripts(findings, wins, packageJson);
  checkTrustSignals(findings, wins, absoluteRepoPath, hasGitHubActions);
  checkContributing(findings, wins, absoluteRepoPath);
  checkEnvExample(findings, wins, absoluteRepoPath, sourceFiles);
  checkSecrets(findings, wins, absoluteRepoPath);

  const categories = scoreCategories(findings);
  const maxScore = categories.reduce((total, category) => total + category.maxScore, 0);
  const score = categories.reduce((total, category) => total + category.score, 0);

  return {
    repoPath: absoluteRepoPath,
    repoName,
    score,
    maxScore,
    grade: gradeFor(score, maxScore),
    categories,
    findings: findings.sort((a, b) => severityRank(b.severity) - severityRank(a.severity)),
    wins,
    generatedAt: new Date().toISOString()
  };
}

function checkReadme(findings: Finding[], wins: string[], readme: string | null): void {
  if (!readme) {
    findings.push(finding("readme.missing", "Missing README", "fail", "demoClarity", "No README. Bold move: the repo is asking people to guess why it exists.", "Add a README with a one-line pitch, quickstart, screenshot, and real example.", 0, 15));
    return;
  }

  if (readme.length < 700) {
    findings.push(finding("readme.thin", "README is too thin", "warn", "demoClarity", "The README is technically present, like a chair drawn on a napkin is technically furniture.", "Add what it does, who it is for, install steps, usage, and at least one realistic example.", 6, 15));
  } else {
    wins.push("README has enough substance to explain the project.");
  }

  if (!/^#\s+\S+/m.test(readme)) {
    findings.push(finding("readme.no-title", "README has no clear title", "warn", "demoClarity", "The first impression is wandering around without a name tag.", "Start the README with a clear H1 project name.", 2, 5));
  } else {
    wins.push("README starts with a clear title.");
  }
}

function checkDemo(findings: Finding[], wins: string[], readme: string | null): void {
  if (!readme) {
    return;
  }

  const hasImage = /!\[[^\]]*]\([^)]+\)/.test(readme) || /<img\s/i.test(readme);
  const hasVideo = /\.(gif|webm|mp4)\b/i.test(readme);
  const hasUsage = /```[\s\S]*?(npm|npx|pnpm|yarn|bun|curl|docker|repo-roast)[\s\S]*?```/i.test(readme);

  if (!hasImage && !hasVideo) {
    findings.push(finding("demo.visual-missing", "No visual demo", "warn", "demoClarity", "There is no screenshot or GIF, so visitors must imagine the cool part. Most will not.", "Add a screenshot, terminal GIF, or short WebM near the top of the README.", 4, 10));
  } else {
    wins.push("README includes a visual demo.");
  }

  if (!hasUsage) {
    findings.push(finding("demo.copy-paste-missing", "No copy-paste usage block", "warn", "demoClarity", "The repo has no obvious command to try. That is where curiosity goes to nap.", "Add a fenced quickstart command people can copy in under 10 seconds.", 3, 10));
  } else {
    wins.push("README includes a copy-pasteable usage example.");
  }
}

function checkInstall(findings: Finding[], wins: string[], readme: string | null, packageJson: Record<string, unknown> | null): void {
  const installMentioned = Boolean(readme && /(install|quickstart|getting started|setup|npm i|npm install|pnpm add|yarn add|pip install|cargo install|go install)/i.test(readme));

  if (!installMentioned) {
    findings.push(finding("setup.install-missing", "Install path is unclear", "fail", "setupExperience", "People cannot install vibes. They need commands.", "Add a Quickstart section with install and run commands.", 0, 15));
  } else {
    wins.push("README mentions installation or setup.");
  }

  if (packageJson && !hasObjectKey(packageJson, "bin") && !hasObjectKey(packageJson, "main") && !hasObjectKey(packageJson, "exports")) {
    findings.push(finding("setup.package-entry-missing", "Package has no obvious entry point", "warn", "setupExperience", "The package.json exists, but it is not pointing visitors to an actual front door.", "Add bin, main, or exports depending on whether this is a CLI or library.", 4, 8));
  }
}

function checkProjectScripts(findings: Finding[], wins: string[], packageJson: Record<string, unknown> | null): void {
  if (!packageJson) {
    return;
  }

  const scripts = typeof packageJson.scripts === "object" && packageJson.scripts !== null ? packageJson.scripts as Record<string, unknown> : {};

  if (!scripts.test) {
    findings.push(finding("trust.test-script-missing", "No test script", "warn", "trustSignals", "No test script. The project is asking for trust with no receipt.", "Add a test script, even if the first version only covers smoke tests.", 4, 10));
  } else {
    wins.push("package.json includes a test script.");
  }

  if (!scripts.build && hasObjectKey(packageJson, "devDependencies")) {
    findings.push(finding("setup.build-script-missing", "No build script", "warn", "setupExperience", "There are dev dependencies, but no build command. Archaeology should not be part of setup.", "Add a build script or document why the project does not need one.", 5, 8));
  } else if (scripts.build) {
    wins.push("package.json includes a build script.");
  }

  if (!scripts.lint) {
    findings.push(finding("trust.lint-script-missing", "No lint script", "info", "trustSignals", "No lint script. Small projects survive this; popular projects eventually regret it.", "Add a lint script before style debates become your issue tracker.", 4, 6));
  } else {
    wins.push("package.json includes a lint script.");
  }
}

function checkTrustSignals(findings: Finding[], wins: string[], repoPath: string, hasGitHubActions: boolean): void {
  if (!findFirstFile(repoPath, ["LICENSE", "LICENSE.md", "COPYING"])) {
    findings.push(finding("trust.license-missing", "Missing license", "fail", "trustSignals", "No license means users cannot safely use the project. That is a star repellent.", "Add an OSI-approved license such as MIT or Apache-2.0.", 0, 15));
  } else {
    wins.push("Repository includes a license.");
  }

  if (!hasGitHubActions) {
    findings.push(finding("trust.ci-missing", "No GitHub Actions workflow", "warn", "trustSignals", "No CI means every green checkmark is powered by hope.", "Add a basic workflow that runs tests and builds on pull requests.", 5, 12));
  } else {
    wins.push("GitHub Actions workflow is present.");
  }

  if (!findFirstFile(repoPath, ["SECURITY.md", ".github/SECURITY.md"])) {
    findings.push(finding("trust.security-missing", "No security policy", "info", "trustSignals", "Security issues currently have nowhere graceful to land.", "Add SECURITY.md with supported versions and a reporting path.", 3, 5));
  } else {
    wins.push("Security policy is present.");
  }
}

function checkContributing(findings: Finding[], wins: string[], repoPath: string): void {
  if (!findFirstFile(repoPath, ["CONTRIBUTING.md", ".github/CONTRIBUTING.md"])) {
    findings.push(finding("contributors.contributing-missing", "Missing contributing guide", "warn", "contributorFriendliness", "Contributors have to infer your workflow by reading your mind. Risky API.", "Add CONTRIBUTING.md with setup, tests, commit style, and PR expectations.", 4, 12));
  } else {
    wins.push("Contributing guide is present.");
  }

  if (!fileExists(repoPath, ".github/ISSUE_TEMPLATE")) {
    findings.push(finding("contributors.issue-template-missing", "Missing issue templates", "info", "contributorFriendliness", "Without issue templates, bug reports arrive as interpretive dance.", "Add bug report and feature request templates under .github/ISSUE_TEMPLATE.", 4, 8));
  } else {
    wins.push("Issue templates are present.");
  }

  if (!findFirstFile(repoPath, ["CODE_OF_CONDUCT.md", ".github/CODE_OF_CONDUCT.md"])) {
    findings.push(finding("contributors.coc-missing", "No code of conduct", "info", "contributorFriendliness", "The community rules are implicit, which scales about as well as sticky notes on a server.", "Add a Code of Conduct if you want outside contributors.", 3, 5));
  } else {
    wins.push("Code of Conduct is present.");
  }
}

function checkEnvExample(findings: Finding[], wins: string[], repoPath: string, sourceFiles: string[]): void {
  const envMentioned = sourceFiles.some((file) => {
    const text = readTextIfExists(repoPath, file);
    return Boolean(text && ENV_ACCESS_PATTERNS.some((pattern) => pattern.test(text)));
  });

  if (!envMentioned) {
    return;
  }

  if (!findFirstFile(repoPath, [".env.example", ".env.sample", "example.env"])) {
    findings.push(finding("setup.env-example-missing", "Environment variables are undocumented", "fail", "setupExperience", "The code uses env vars, but there is no example file. Setup has become a guessing game.", "Add .env.example with every required variable and safe placeholder values.", 0, 12));
  } else {
    wins.push("Environment variables have an example file.");
  }
}

function checkSecrets(findings: Finding[], wins: string[], repoPath: string): void {
  const candidateFiles = findFiles(repoPath, (file) => /\.(env|ts|tsx|js|jsx|py|go|rs|json|yaml|yml)$/.test(file));
  const suspiciousFile = candidateFiles.find((file) => {
    const text = readTextIfExists(repoPath, file);
    return Boolean(text && SECRET_PATTERNS.some((pattern) => pattern.test(text)));
  });

  if (suspiciousFile) {
    findings.push(finding("trust.secret-suspect", "Possible secret detected", "fail", "trustSignals", `Possible secret-like value found in ${suspiciousFile}. Stars are nice; incident response is less nice.`, "Remove the secret, rotate it if real, and add secret scanning to CI.", 0, 18));
  } else {
    wins.push("No obvious hardcoded secrets found.");
  }
}

function scoreCategories(findings: Finding[]): CategoryScore[] {
  return (Object.keys(CATEGORY_LABELS) as Category[]).map((category) => {
    const categoryFindings = findings.filter((item) => item.category === category);
    const maxScore = defaultMaxScore(category);
    const lost = categoryFindings.reduce((total, item) => total + (item.maxPoints - item.points), 0);

    return {
      category,
      label: CATEGORY_LABELS[category],
      score: Math.max(0, maxScore - lost),
      maxScore
    };
  });
}

function defaultMaxScore(category: Category): number {
  switch (category) {
    case "demoClarity":
      return 40;
    case "setupExperience":
      return 35;
    case "trustSignals":
      return 45;
    case "contributorFriendliness":
      return 25;
  }
}

function gradeFor(score: number, maxScore: number): string {
  const ratio = maxScore === 0 ? 1 : score / maxScore;

  if (ratio >= 0.9) return "A";
  if (ratio >= 0.8) return "B";
  if (ratio >= 0.7) return "C";
  if (ratio >= 0.6) return "D";
  return "F";
}

function severityRank(severity: "info" | "warn" | "fail"): number {
  return { info: 1, warn: 2, fail: 3 }[severity];
}

function finding(
  id: string,
  title: string,
  severity: "info" | "warn" | "fail",
  category: Category,
  roast: string,
  fix: string,
  points: number,
  maxPoints: number
): Finding {
  return { id, title, severity, category, roast, fix, points, maxPoints };
}

function readPackageJson(repoPath: string): Record<string, unknown> | null {
  const text = readTextIfExists(repoPath, "package.json");

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function hasObjectKey(value: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}
