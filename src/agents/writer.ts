import { Agent } from "@opperai/agents";
import { z } from "zod";
import type { SpecIndex } from "../spec-index.js";
import type { LanguageProfile } from "../languages/language.js";
import type { SdkPlan, SdkFile } from "./planner.js";
import type { ExistingFile } from "../existing-sdk.js";
import { createSpecTools, createSdkTools } from "../tools.js";

const FileOutputSchema = z.object({
  code: z
    .string()
    .describe("The complete file content (source code or configuration)"),
});

export type FileOutput = z.infer<typeof FileOutputSchema>;

export interface WriterInput {
  file: SdkFile;
  plan: SdkPlan;
  fixErrors?: string;
}

export function createWriterAgent(
  specIndex: SpecIndex,
  language: LanguageProfile,
  options: {
    instructions?: string;
    model?: string;
    existingFiles: ExistingFile[];
    generatedFiles: Map<string, string>;
  }
) {
  const specTools = createSpecTools(specIndex);
  const sdkTools = createSdkTools(
    options.existingFiles,
    options.generatedFiles
  );

  const userInstructions = options.instructions
    ? `\n\nUser instructions:\n${options.instructions}`
    : "";

  return new Agent<WriterInput, FileOutput>({
    name: "sdk-writer",
    instructions: `You are an SDK code writer. Write clean, production-quality code for the given file.

${language.writerInstructions}

General rules:
- Use the spec tools to look up endpoint details, schemas, and auth info as needed
- Use read_generated_file to read files from earlier generation stages (e.g. read types.ts when writing a client)
- Use read_existing_file to read existing SDK code and match its style
- Output only the file content, no markdown fences or explanation
- The full SDK plan is provided so you know what other files exist and can create correct imports
- If fixErrors is provided, the current file content is in the generated files — read it with read_generated_file and fix the reported errors

When generating code:
- Make all imports explicit and correct relative to the file's location in the plan
- Ensure all referenced types are properly imported
- Generate complete, compilable code — no placeholders or TODOs${userInstructions}`,
    tools: [...specTools.all, ...sdkTools.all],
    model: options.model,
    outputSchema: FileOutputSchema,
    maxIterations: 10,
  });
}
