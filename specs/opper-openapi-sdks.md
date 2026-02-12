# opper-openapi-sdks

> An agent-powered CLI tool that generates SDKs from OpenAPI specs using the Opper Agent SDK.

## Problem

Generating SDKs from OpenAPI specs typically requires mechanical code generators (openapi-generator, Speakeasy) that produce verbose, opinionated code. They lack the flexibility to match an existing codebase's style, make intelligent architectural decisions, or produce idiomatic code for each language.

## Solution

A TypeScript CLI tool powered by the Opper Agent SDK. An agent reads the OpenAPI spec through tools, plans the SDK file structure, and writes each file with full access to the spec and previously generated files. The pipeline is language-agnostic — language-specific knowledge lives in a `LanguageProfile` that provides planning/writing instructions and verification commands.

## Architecture

```
OpenAPI Spec -> Parse -> Language Profile -> Plan Agent -> Hash Check -> Writer Agent -> Verify -> Cache
```

The core pipeline is language-agnostic. Language-specific knowledge lives in a `LanguageProfile` that provides:
- File extensions
- Planner instructions (file structure conventions)
- Writer instructions (code style rules)
- Verification command and error parser
- Available file types

## Core Flow

1. Parse OpenAPI spec + build index (shared with opper-openapi-docs)
2. Read existing SDK files from output directory
3. Run planner agent -> get SdkPlan (file list with types and order)
4. Compute content hashes per file, compare with manifest
5. Generate files in order (respecting imports), same-order files in parallel
6. Writer agent has tools: spec tools + read_generated_file + read_existing_file
7. Run verification loop (max 2 fix attempts)
8. Update manifest

## SDK Plan Schema

```typescript
interface SdkFile {
  id: string;            // "package-config", "types", "client:pets"
  outputPath: string;    // "package.json", "src/types.ts"
  type: SdkFileType;     // "package-config" | "types" | "client-base" | "client" | "index"
  description: string;
  relatedTags?: string[];
  relatedSchemas?: string[];
  order: number;         // Generation order (0=first, parallel within same level)
}
```

## Generation Order

1. `package-config` (order 0) — package.json / tsconfig.json
2. `types` (order 1) — all interfaces/models from schemas
3. `client-base` (order 2) — base class with auth, fetch, error handling
4. `client` files (order 3) — one per tag, imports from types + client-base
5. `index` (order 4) — re-exports

## Language System

Adding a new language = one new file with a `LanguageProfile`:

```
src/languages/
├── language.ts       # LanguageProfile interface
├── typescript.ts     # TypeScript profile
└── index.ts          # Registry
```

## Caching

Same manifest pattern as opper-openapi-docs. Hash key per file type:
- `types` -> hash all schemas
- `client-base` -> hash security schemes + servers
- `client` -> hash endpoints for related tags + referenced schemas
- `index` -> hash tag list
- `package-config` -> hash API info

## CLI

```
opper-openapi-sdks generate \
  --spec ./openapi.yaml \
  --language typescript \
  [--output ./sdk] [--force] [--instructions "..."] [--model "..."] [--no-verify]
```

## Implementation Phases

### Phase 1 - Scaffold + Core
- [x] Project scaffolding (package.json, tsconfig, tsup, .gitignore)
- [x] Copy spec-index.ts + manifest.ts + petstore fixture from opper-openapi-docs
- [x] Adapt manifest for SDK (`.openapi-sdks-manifest.json`)
- [x] Unit tests for spec-index, manifest

### Phase 2 - Language System
- [x] LanguageProfile interface
- [x] TypeScript profile (planner/writer instructions, tsc verify)
- [x] Language registry

### Phase 3 - SDK Tools + Utilities
- [x] tools.ts (spec tools + SDK tools: read_existing_file, list_existing_files, read_generated_file)
- [x] existing-sdk.ts (read existing files matching language extensions)
- [x] verify.ts (generic verification runner)
- [x] hashing.ts (SDK-specific section types)
- [x] Unit tests for hashing, existing-sdk, verify

### Phase 4 - Agents
- [x] planner.ts (injects language.plannerInstructions)
- [x] writer.ts (injects language.writerInstructions, SDK tools)

### Phase 5 - Orchestrator + CLI
- [x] generate.ts (ordered generation, caching, verify loop)
- [x] config.ts (--language flag, SDK-specific config)
- [x] cli.ts (Commander-based CLI)
- [x] index.ts (library exports)

### Phase 6 - GitHub Action + CI
- [x] action.yml (composite action with language input)
- [x] .github/workflows/ci.yml (lint, test, build, auto-release)

## Status

- [x] Spec written
- [x] Phase 1 - Scaffold + Core
- [x] Phase 2 - Language System
- [x] Phase 3 - SDK Tools + Utilities
- [x] Phase 4 - Agents
- [x] Phase 5 - Orchestrator + CLI
- [x] Phase 6 - GitHub Action + CI
