import * as fs   from 'fs';
import * as path from 'path';

export function fileExists(fsPath: string): boolean {
  try { return fs.existsSync(fsPath); }
  catch { return false; }
}

export function getBasename(fsPath: string): string {
  return path.basename(fsPath);
}

/** Shorten a path for display: ~/projects/foo/bar.ts */
export function prettyPath(fsPath: string): string {
  const home = process.env.HOME ?? process.env.USERPROFILE ?? '';
  return home ? fsPath.replace(home, '~') : fsPath;
}
