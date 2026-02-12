# Generate type-safe SDKs from OpenAPI specs using AI agents

Unlike mechanical code generators (openapi-generator, Speakeasy), this tool uses AI agents to produce idiomatic, type-safe SDKs. Agents read the spec through tools, plan the file structure, and write each file with full access to the spec and previously generated code.

See the [generated Petstore SDK](examples/petstore/) for example output.

## Quick Start

```bash
npm install opper-openapi-sdks
export OPPER_API_KEY=your-key  # get one at https://opper.ai

npx opper-openapi-sdks generate --spec ./openapi.yaml --output ./sdk
```

## CLI

### `generate`

Generate an SDK from an OpenAPI spec (3.0 or 3.1, JSON or YAML).

```bash
npx opper-openapi-sdks generate --spec ./openapi.yaml [options]
```

| Flag | Description | Default |
|------|-------------|---------|
| `--spec <path>` | Path to OpenAPI spec file | (required) |
| `--output <dir>` | Output directory | `./sdk` |
| `--language <lang>` | Target language | `typescript` |
| `--instructions <text>` | Custom generation instructions | |
| `--model <model>` | LLM model to use | |
| `--force` | Regenerate all files (ignore cache) | |
| `--no-verify` | Skip verification step | |

## GitHub Action

Use in CI to generate SDKs automatically on spec changes.

```yaml
name: Generate SDK

on:
  push:
    paths:
      - 'openapi.yaml'

jobs:
  sdk:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: opper-ai/opper-openapi-sdks@v1
        with:
          spec: ./openapi.yaml
          opper-api-key: ${{ secrets.OPPER_API_KEY }}
```

### Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `spec` | Path to OpenAPI spec file | Yes | |
| `output` | Output directory | No | `./sdk` |
| `language` | Target language | No | `typescript` |
| `instructions` | Custom generation instructions | No | |
| `model` | LLM model to use | No | |
| `verify` | Run verification after generation | No | `true` |
| `opper-api-key` | Opper API key | Yes | |

### Outputs

| Output | Description |
|--------|-------------|
| `sdk-dir` | Path to generated SDK |

## Caching

The tool caches generated files based on content hashes. When you re-run `generate`:

- Unchanged files are skipped (based on spec content hashes per file type)
- Only files whose relevant spec content changed are regenerated
- Use `--force` to regenerate all files

## How It Works

1. **Parse** - Reads and indexes the OpenAPI spec (resolves all `$ref`s)
2. **Plan** - A planning agent analyzes the spec and decides the SDK file structure
3. **Write** - A writer agent generates each file with full spec access via tools
4. **Verify** - Runs the language's compiler to check for errors, auto-fixes if needed

## Adding Languages

The pipeline is language-agnostic. Language-specific knowledge lives in a `LanguageProfile`:

```typescript
interface LanguageProfile {
  name: string;
  extensions: string[];
  plannerInstructions: string;  // file structure conventions
  writerInstructions: string;   // code style rules
  verify?: { command: string[]; parseErrors: (output: string) => VerifyError[] };
  fileTypes: SdkFileType[];
}
```

Adding a new language = one new file implementing this interface.

## License

MIT
