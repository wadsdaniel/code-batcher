import fs from 'fs';
import path from 'path';
import ignore, { Ignore } from 'ignore';

/**
 * Explicit files we NEVER want to expose to the user
 */
const EXCLUDED_FILES = new Set([
  '.gitignore',
  '.prettierrc',
  '.prettierrc.json',
  '.prettierrc.js',
  '.eslintrc',
  '.eslintrc.json',
  '.editorconfig',
  '.npmrc',
  '.env',
  '.env.example',
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'tsconfig.build.json',
  'eslint.config.js',
]);

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  selected: boolean;
  children?: FileNode[];
}

/**
 * Determines whether a file/folder should be excluded
 */
const shouldExcludeEntry = (name: string): boolean => {
  // Exclude dotfiles and dotfolders
  if (name.startsWith('.')) return true;

  // Exclude known config / metadata files
  if (EXCLUDED_FILES.has(name)) return true;

  return false;
};

/**
 * Loads .gitignore rules from project root
 */
function loadGitIgnore(projectPath: string): Ignore {
  const ig = ignore();
  const gitIgnorePath = path.join(projectPath, '.gitignore');

  if (fs.existsSync(gitIgnorePath)) {
    const content = fs.readFileSync(gitIgnorePath, 'utf8');
    ig.add(content);
  }

  return ig;
}

/**
 * Recursively scans directories while respecting:
 * - .gitignore
 * - dotfiles
 * - explicit excluded files
 */
export function scanDirectory(dirPath: string, projectRoot: string, ig: Ignore): FileNode[] {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const result: FileNode[] = [];

  for (const entry of entries) {
    const name = entry.name;

    // 🚫 Skip dotfiles & explicitly excluded files
    if (shouldExcludeEntry(name)) continue;

    const fullPath = path.join(dirPath, name);
    const relativePath = path.relative(projectRoot, fullPath);

    // 🚫 Skip files ignored by .gitignore
    if (ig.ignores(relativePath)) continue;

    if (entry.isDirectory()) {
      const children = scanDirectory(fullPath, projectRoot, ig);

      // Skip empty folders after filtering
      if (children.length === 0) continue;

      result.push({
        name,
        path: fullPath,
        type: 'folder',
        selected: false,
        children,
      });
    } else {
      result.push({
        name,
        path: fullPath,
        type: 'file',
        selected: false,
      });
    }
  }

  return result;
}

/**
 * Entry function used by controller
 */
export function scanProject(projectPath: string): FileNode[] {
  const ig = loadGitIgnore(projectPath);
  return scanDirectory(projectPath, projectPath, ig);
}
