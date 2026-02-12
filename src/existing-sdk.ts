import { readFile, readdir } from "fs/promises";
import { resolve, join, relative, extname } from "path";

import type { LanguageProfile } from "./languages/language.js";

export interface ExistingFile {
  relativePath: string;
  content: string;
}

export async function readExistingFiles(
  outputDir: string,
  language: LanguageProfile
): Promise<ExistingFile[]> {
  const absDir = resolve(outputDir);
  const extensionSet = new Set(language.extensions);
  const files: ExistingFile[] = [];

  async function walk(dir: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name === ".git") continue;
        await walk(fullPath);
      } else if (extensionSet.has(extname(entry.name))) {
        const content = await readFile(fullPath, "utf-8");
        files.push({
          relativePath: relative(absDir, fullPath),
          content,
        });
      }
    }
  }

  await walk(absDir);
  return files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}
