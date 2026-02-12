import { execFile } from "child_process";
import { promisify } from "util";
import { resolve, relative, isAbsolute } from "path";
import type { LanguageProfile, VerifyError } from "./languages/language.js";

const execFileAsync = promisify(execFile);

export async function runVerify(
  language: LanguageProfile,
  outputDir: string
): Promise<VerifyError[]> {
  if (!language.verify) return [];

  const { command, parseErrors } = language.verify;
  const [cmd, ...args] = command;
  const absOutputDir = resolve(outputDir);

  try {
    await execFileAsync(cmd, [...args, absOutputDir], {
      timeout: 30_000,
    });
    return [];
  } catch (err: unknown) {
    const stdout = (err as { stdout?: string }).stdout ?? "";
    const stderr = (err as { stderr?: string }).stderr ?? "";
    const output = stdout + stderr;

    const errors = parseErrors(output);

    // Normalize file paths to be relative to the output directory
    for (const error of errors) {
      if (isAbsolute(error.file)) {
        error.file = relative(absOutputDir, error.file);
      } else {
        // Handle relative paths like ../../../../../tmp/petstore-sdk/src/types.ts
        const resolved = resolve(error.file);
        if (resolved.startsWith(absOutputDir)) {
          error.file = relative(absOutputDir, resolved);
        }
      }
    }

    // If the command failed but we couldn't parse any structured errors,
    // report the raw output as a single error so the writer can attempt a fix
    if (errors.length === 0 && output.trim().length > 0) {
      return [
        {
          file: "unknown",
          line: 0,
          message: output.trim().slice(0, 500),
        },
      ];
    }

    return errors;
  }
}
