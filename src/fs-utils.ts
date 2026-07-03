import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const IGNORED_DIRS = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  "coverage",
  ".next",
  ".turbo",
  "vendor"
]);

export function fileExists(repoPath: string, relativePath: string): boolean {
  return existsSync(path.join(repoPath, relativePath));
}

export function readTextIfExists(repoPath: string, relativePath: string): string | null {
  const fullPath = path.join(repoPath, relativePath);

  if (!existsSync(fullPath)) {
    return null;
  }

  const stat = statSync(fullPath);
  if (!stat.isFile() || stat.size > 1024 * 1024) {
    return null;
  }

  return readFileSync(fullPath, "utf8");
}

export function findFirstFile(repoPath: string, candidates: string[]): string | null {
  return candidates.find((candidate) => fileExists(repoPath, candidate)) ?? null;
}

export function findFiles(repoPath: string, predicate: (relativePath: string) => boolean): string[] {
  const results: string[] = [];

  function walk(currentPath: string, relativeBase: string): void {
    for (const entry of readdirSync(currentPath, { withFileTypes: true })) {
      if (entry.isDirectory() && IGNORED_DIRS.has(entry.name)) {
        continue;
      }

      const relativePath = path.join(relativeBase, entry.name);
      const fullPath = path.join(currentPath, entry.name);

      if (entry.isDirectory()) {
        walk(fullPath, relativePath);
        continue;
      }

      if (entry.isFile() && predicate(relativePath.replaceAll("\\", "/"))) {
        results.push(relativePath.replaceAll("\\", "/"));
      }
    }
  }

  walk(repoPath, "");
  return results;
}
