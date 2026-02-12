import { readFile } from "fs/promises";
import { resolve } from "path";
import { getLanguage } from "./languages/index.js";
import type { LanguageProfile } from "./languages/language.js";

export interface Config {
  spec: string;
  language: string;
  languageProfile: LanguageProfile;
  output: string;
  instructions?: string;
  model?: string;
  force?: boolean;
  verify?: boolean;
}

const CONFIG_FILENAME = "opper-sdks.config.json";
const DEFAULT_MODEL = "openai/gpt-5.2";

export async function loadConfig(
  cliOptions: Partial<Config> & { verify?: boolean }
): Promise<Config> {
  let fileConfig: Partial<Config> = {};

  try {
    const raw = await readFile(resolve(CONFIG_FILENAME), "utf-8");
    fileConfig = JSON.parse(raw);
  } catch {
    // No config file, that's fine
  }

  const language = cliOptions.language ?? fileConfig.language ?? "typescript";
  const languageProfile = getLanguage(language);

  const merged: Config = {
    spec: cliOptions.spec ?? fileConfig.spec ?? "",
    language,
    languageProfile,
    output: cliOptions.output ?? fileConfig.output ?? "./sdk",
    instructions: cliOptions.instructions ?? fileConfig.instructions,
    model: cliOptions.model ?? fileConfig.model ?? DEFAULT_MODEL,
    force: cliOptions.force ?? false,
    verify: cliOptions.verify ?? true,
  };

  if (!merged.spec) {
    throw new Error(
      "No spec file provided. Use --spec or set 'spec' in opper-sdks.config.json"
    );
  }

  if (!process.env.OPPER_API_KEY) {
    throw new Error(
      "OPPER_API_KEY environment variable is required. Get your key at https://opper.ai"
    );
  }

  return merged;
}
