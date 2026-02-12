import type { LanguageProfile } from "./language.js";
import { typescript } from "./typescript.js";

const languages = new Map<string, LanguageProfile>([
  ["typescript", typescript],
]);

export function getLanguage(name: string): LanguageProfile {
  const profile = languages.get(name);
  if (!profile) {
    const available = Array.from(languages.keys()).join(", ");
    throw new Error(
      `Unknown language: "${name}". Available languages: ${available}`
    );
  }
  return profile;
}

export function listLanguages(): string[] {
  return Array.from(languages.keys());
}
