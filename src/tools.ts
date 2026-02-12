import { createFunctionTool } from "@opperai/agents";
import { z } from "zod";
import type { SpecIndex } from "./spec-index.js";
import type { ExistingFile } from "./existing-sdk.js";

export function createSpecTools(specIndex: SpecIndex) {
  const listTagsTool = createFunctionTool(
    () =>
      specIndex.tags.map((t) => ({
        name: t.name,
        description: t.description ?? "",
      })),
    {
      name: "list_tags",
      description: "List all API tags with descriptions",
      schema: z.object({}),
    }
  );

  const readEndpointsTool = createFunctionTool(
    (input: { tag: string }) => {
      const endpoints = specIndex.pathsByTag.get(input.tag) ?? [];
      return endpoints;
    },
    {
      name: "read_endpoints",
      description:
        "Get all endpoints for a given tag with full request/response details. Use 'untagged' for endpoints without tags.",
      schema: z.object({ tag: z.string() }),
    }
  );

  const readSchemaTool = createFunctionTool(
    (input: { name: string }) => specIndex.schemas.get(input.name) ?? null,
    {
      name: "read_schema",
      description:
        "Get a schema definition by name with all $refs resolved",
      schema: z.object({ name: z.string() }),
    }
  );

  const listSchemasTool = createFunctionTool(
    () => Array.from(specIndex.schemas.keys()),
    {
      name: "list_schemas",
      description: "List all available schema names",
      schema: z.object({}),
    }
  );

  const readSecurityTool = createFunctionTool(
    () => specIndex.security,
    {
      name: "read_security",
      description: "Get all security/authentication schemes",
      schema: z.object({}),
    }
  );

  const readSpecInfoTool = createFunctionTool(
    () => ({
      info: specIndex.info,
      servers: specIndex.servers,
    }),
    {
      name: "read_spec_info",
      description:
        "Get API metadata: title, version, description, servers",
      schema: z.object({}),
    }
  );

  return {
    listTagsTool,
    readEndpointsTool,
    readSchemaTool,
    listSchemasTool,
    readSecurityTool,
    readSpecInfoTool,
    all: [
      listTagsTool,
      readEndpointsTool,
      readSchemaTool,
      listSchemasTool,
      readSecurityTool,
      readSpecInfoTool,
    ],
  };
}

export function createSdkTools(
  existingFiles: ExistingFile[],
  generatedFiles: Map<string, string>
) {
  const listExistingFilesTool = createFunctionTool(
    () => existingFiles.map((f) => f.relativePath),
    {
      name: "list_existing_files",
      description:
        "List all existing SDK file paths in the output directory",
      schema: z.object({}),
    }
  );

  const readExistingFileTool = createFunctionTool(
    (input: { path: string }) => {
      const file = existingFiles.find((f) => f.relativePath === input.path);
      return file?.content ?? null;
    },
    {
      name: "read_existing_file",
      description:
        "Read the content of an existing SDK file by its relative path",
      schema: z.object({ path: z.string() }),
    }
  );

  const readGeneratedFileTool = createFunctionTool(
    (input: { path: string }) => generatedFiles.get(input.path) ?? null,
    {
      name: "read_generated_file",
      description:
        "Read the content of a file generated in an earlier order level (e.g. types.ts when writing a client)",
      schema: z.object({ path: z.string() }),
    }
  );

  return {
    listExistingFilesTool,
    readExistingFileTool,
    readGeneratedFileTool,
    all: [listExistingFilesTool, readExistingFileTool, readGeneratedFileTool],
  };
}
