import { execFile } from "child_process";
import { promisify } from "util";
import type { LanguageProfile, VerifyError } from "./languages/language.js";

const execFileAsync = promisify(execFile);

export async function runVerify(
  language: LanguageProfile,
  outputDir: string
): Promise<VerifyError[]> {
  if (!language.verify) return [];

  const { command, parseErrors } = language.verify;
  const [cmd, ...args] = command;

  try {
    await execFileAsync(cmd, [...args, outputDir], {
      cwd: outputDir,
      timeout: 30_000,
    });
    return [];
  } catch (err: unknown) {
    const output =
      (err as { stdout?: string; stderr?: string }).stdout ??
      (err as { stdout?: string; stderr?: string }).stderr ??
      "";
    return parseErrors(output);
  }
}
