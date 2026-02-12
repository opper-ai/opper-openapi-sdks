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
  extensions: [".ts", ".json", ".md"],
  plannerInstructions: `You are planning a TypeScript SDK. Follow these conventions:

File structure (MUST include all of these):
- package.json at root (type: "package-config", id: "package-json", order: 0)
- tsconfig.json at root (type: "package-config", id: "tsconfig-json", order: 0)
- src/types.ts for all interfaces and type definitions (type: "types", order: 1)
- src/client-base.ts for the base HTTP client class (type: "client-base", order: 2)
- src/clients/{tag-slug}.ts for each tag's client class (type: "client", order: 3)
- src/index.ts that re-exports everything (type: "index", order: 4)
- README.md at root (type: "readme", id: "readme", order: 5)

Naming conventions:
- Use PascalCase for types and interfaces
- Use camelCase for methods and variables
- Use kebab-case for file names
- Client classes: {Tag}Client (e.g. PetsClient, StoreClient)
- Method names match operationId in camelCase

package.json must include:
- "type": "module"
- TypeScript as devDependency
- A "build" script using tsc

tsconfig.json must include:
- "target": "ES2022"
- "module": "ESNext"
- "moduleResolution": "bundler"
- "strict": true
- "outDir": "./dist"
- "rootDir": "./src"
- "declaration": true
- "skipLibCheck": true
- "include": ["src"]

Each client file imports from types.ts and extends the base client.
The index file re-exports the main client class and all types.`,

  writerInstructions: `You are writing TypeScript SDK code. Follow these rules:

CRITICAL import rules:
- ALL relative imports MUST use .js extension (ESM requirement): import { Foo } from './types.js' NOT './types'
- ALL relative imports MUST use .js extension: import { BaseClient } from '../client-base.js' NOT '../client-base'
- This applies to EVERY relative import in EVERY file

Code style:
- Use strict TypeScript with explicit types (no any)
- Use interface for API types, type for unions/intersections
- Use async/await consistently
- Use template literals for URL construction
- Export all public types and classes

HTTP client base (src/client-base.ts):
- Define a ClientConfig interface: { baseUrl?: string; apiKey: string; headers?: Record<string, string> }
- Constructor takes ClientConfig
- Use native fetch (no dependencies)
- Include proper error handling with a typed ApiError class
- The ApiError class must be defined in types.ts and imported by client-base.ts
- Support JSON request/response bodies
- Include query parameter serialization
- Set Content-Type and API key headers based on the security scheme

Client methods:
- One method per operation
- Method signature matches the operation's parameters and request body
- Return typed response objects
- Path parameters interpolated into URL using encodeURIComponent
- Query parameters passed as options object
- Request body as typed parameter

Types (src/types.ts):
- Generate interfaces from all schema components
- Use readonly for response types
- Make optional fields explicit with ?
- Include JSDoc comments from schema descriptions
- Define ApiError class here (extends Error, has status, statusText, body properties)

tsconfig.json:
- When writing tsconfig.json, output valid JSON with the exact settings from the plan

README.md (type: "readme"):
- Use read_generated_file to read the actual generated code for accurate examples
- Include: API title and description from the spec
- Installation: npm install instructions using the package name from package.json
- Quickstart: a minimal working example showing client initialization and one API call
- Client usage: document each client class and its methods with brief examples
- Types reference: list the main exported types/interfaces
- Write in Markdown format

Do NOT:
- Import from external packages (except devDependencies in package.json)
- Use enum (use string literal unions instead)
- Use namespace
- Use default exports (always use named exports)
- Use relative imports WITHOUT .js extension`,

  verify: {
    command: ["npx", "tsc", "--noEmit", "--project"],
    parseErrors: parseTscErrors,
  },

  fileTypes: ["package-config", "types", "client-base", "client", "index", "readme"],
};
