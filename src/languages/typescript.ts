import type { LanguageProfile, VerifyError } from "./language.js";

function parseTscErrors(output: string): VerifyError[] {
  const errors: VerifyError[] = [];
  const regex = /^(.+?)\((\d+),\d+\): error TS\d+: (.+)$/gm;
  let match;
  while ((match = regex.exec(output)) !== null) {
    errors.push({
      file: match[1],
      line: parseInt(match[2], 10),
      message: match[3],
    });
  }
  return errors;
}

export const typescript: LanguageProfile = {
  name: "typescript",
  extensions: [".ts", ".json"],
  plannerInstructions: `You are planning a TypeScript SDK. Follow these conventions:

File structure:
- package.json at root (type: "package-config", order: 0)
- src/types.ts for all interfaces and type definitions (type: "types", order: 1)
- src/client-base.ts for the base HTTP client class (type: "client-base", order: 2)
- src/clients/{tag-slug}.ts for each tag's client class (type: "client", order: 3)
- src/index.ts that re-exports everything (type: "index", order: 4)

Naming conventions:
- Use PascalCase for types and interfaces
- Use camelCase for methods and variables
- Use kebab-case for file names
- Client classes: {Tag}Client (e.g. PetsClient, StoreClient)
- Method names match operationId in camelCase

Package.json should include:
- "type": "module"
- TypeScript as devDependency
- tsconfig.json settings for strict mode
- A "build" script using tsc

Each client file imports from types.ts and extends the base client.
The index file re-exports the main client class and all types.`,

  writerInstructions: `You are writing TypeScript SDK code. Follow these rules:

Code style:
- Use strict TypeScript with explicit types (no any)
- Use interface for API types, type for unions/intersections
- Use async/await consistently
- Use template literals for URL construction
- Export all public types and classes

HTTP client base:
- Constructor takes { baseUrl, apiKey, headers? }
- Use native fetch (no dependencies)
- Include proper error handling with typed error responses
- Support JSON request/response bodies
- Include query parameter serialization
- Set Content-Type and Authorization headers

Client methods:
- One method per operation
- Method signature matches the operation's parameters and request body
- Return typed response objects
- Path parameters interpolated into URL
- Query parameters passed as options object
- Request body as typed parameter

Types:
- Generate interfaces from all schema components
- Use readonly for response types
- Make optional fields explicit with ?
- Include JSDoc comments from schema descriptions

Do NOT:
- Import from external packages (except devDependencies in package.json)
- Use enum (use string literal unions instead)
- Use namespace
- Use default exports (always use named exports)`,

  verify: {
    command: ["npx", "tsc", "--noEmit", "--project"],
    parseErrors: parseTscErrors,
  },

  fileTypes: ["package-config", "types", "client-base", "client", "index"],
};
