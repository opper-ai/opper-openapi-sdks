import { Agent } from "@opperai/agents";
import { z } from "zod";
import type { SpecIndex } from "../spec-index.js";
import type { LanguageProfile } from "../languages/language.js";
import { createSpecTools } from "../tools.js";

const SdkFileSchema = z.object({
  id: z
    .string()
    .describe(
      "Unique file identifier, e.g. 'package-config', 'types', 'client:pets'"
    ),
  outputPath: z
    .string()
    .describe("Relative file path, e.g. 'package.json', 'src/types.ts'"),
  type: z.enum(["package-config", "types", "client-base", "client", "index", "readme", "examples"]),
  description: z
    .string()
    .describe("Brief description of what this file should contain"),
  relatedTags: z
    .array(z.string())
    .optional()
    .describe("Tags this file depends on (for client files)"),
  relatedSchemas: z
    .array(z.string())
    .optional()
    .describe("Schema names this file depends on"),
  order: z
    .number()
    .describe(
      "Generation order (0=first). Files at the same order level run in parallel."
    ),
});

const SdkPlanSchema = z.object({
  files: z.array(SdkFileSchema),
});

export type SdkPlan = z.infer<typeof SdkPlanSchema>;
export type SdkFile = z.infer<typeof SdkFileSchema>;

export function createPlanningAgent(
  specIndex: SpecIndex,
  language: LanguageProfile,
  options: { instructions?: string; model?: string; existingPaths?: string[] }
) {
  const tools = createSpecTools(specIndex);

  const userInstructions = options.instructions
    ? `\n\nUser instructions:\n${options.instructions}`
    : "";

  const existingContext =
    options.existingPaths && options.existingPaths.length > 0
      ? `\n\nExisting SDK files in output directory (preserve this structure if possible):\n${options.existingPaths.map((p) => `- ${p}`).join("\n")}`
      : "";

  return new Agent<string, SdkPlan>({
    name: "sdk-planner",
    instructions: `You are an SDK architect. Analyze the OpenAPI spec using the available tools and plan the SDK file structure.

${language.plannerInstructions}

General rules:
- Each file must have a unique id
- Use the "type" field to categorize files
- Set "order" to control generation order (files at the same order level can be generated in parallel)
- For "client" type files, set relatedTags to the tag names and relatedSchemas to schemas referenced by those endpoints
- Use lowercase kebab-case for file names
- Every schema component should be represented in the types file
- Every tag should have a corresponding client file

Use the tools to explore the spec before deciding on the structure.${existingContext}${userInstructions}`,
    tools: tools.all,
    model: options.model,
    outputSchema: SdkPlanSchema,
    maxIterations: 10,
  });
}
