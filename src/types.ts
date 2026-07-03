export type Severity = "info" | "warn" | "fail";

export type Category =
  | "demoClarity"
  | "setupExperience"
  | "trustSignals"
  | "contributorFriendliness";

export interface Finding {
  id: string;
  title: string;
  severity: Severity;
  category: Category;
  roast: string;
  fix: string;
  points: number;
  maxPoints: number;
}

export interface CategoryScore {
  category: Category;
  label: string;
  score: number;
  maxScore: number;
}

export interface RoastReport {
  repoPath: string;
  repoName: string;
  score: number;
  maxScore: number;
  grade: string;
  categories: CategoryScore[];
  findings: Finding[];
  wins: string[];
  generatedAt: string;
}

export interface CliOptions {
  json: boolean;
  color: boolean;
}
