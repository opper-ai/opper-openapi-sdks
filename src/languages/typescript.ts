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
- src/index.ts with a unified client class and re-exports (type: "index", order: 4)
- README.md at root (type: "readme", id: "readme", order: 5)
- examples/basic-usage.ts (type: "examples", id: "examples", order: 6)

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
The index file MUST define a unified client class (named after the API, e.g. PetstoreClient, TaskApiClient) that:
- Takes ClientConfig in its constructor
- Exposes each tag client as a property (e.g. client.pets, client.store, client.functions)
- Instantiates each sub-client with the shared config
The index file also re-exports all sub-clients, types, and ClientConfig.`,

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

Index file (src/index.ts):
- Use read_generated_file to read all client files so you know the exact class names and imports
- Define a unified client class named after the API (e.g. PetstoreClient) that takes ClientConfig
- Add a readonly property for each tag client using camelCase (e.g. pets, store, functions)
- In the constructor, instantiate each sub-client with the shared config
- Re-export the unified client, all sub-clients, all types, ClientConfig, and RequestOptions

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

Examples (type: "examples"):
- Use read_generated_file to read src/index.ts to get the unified client class name and imports
- Write a single self-contained TypeScript file that demonstrates real API usage
- Import from the package using relative path '../src/index.js'
- Read the API key from process.env (e.g. process.env.OPPER_API_KEY or process.env.API_KEY)
- Show 2-3 realistic API calls using the unified client (e.g. client.pets.listPets())
- Include console.log output so the user can see results
- Add brief comments explaining each step
- The example must be runnable with: npx tsx examples/basic-usage.ts

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

  fileTypes: ["package-config", "types", "client-base", "client", "index", "readme", "examples"],
};
