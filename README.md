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

### Auto-update a separate SDK repo

A common pattern is to keep the generated SDK in its own repo so consumers can install it directly. The API repo generates the SDK on merge and opens a PR on the SDK repo with the changes.

**Setup:**

1. Create a separate repo for the SDK (e.g. `your-org/your-api-sdk`)
2. Create a [fine-grained personal access token](https://github.com/settings/tokens?type=beta) with `contents: write` and `pull_requests: write` permissions on the SDK repo
3. Add it as `SDK_REPO_TOKEN` in the API repo's secrets
4. Add `OPPER_API_KEY` to the API repo's secrets

**Workflow** (in your API repo):

```yaml
name: Generate SDK

on:
  push:
    branches: [main]
    paths: [openapi.yaml]

jobs:
  sdk:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: opper-ai/opper-openapi-sdks@v1
        id: generate
        with:
          spec: ./openapi.yaml
          opper-api-key: ${{ secrets.OPPER_API_KEY }}

      - uses: actions/checkout@v4
        with:
          repository: your-org/your-api-sdk
          path: ./sdk-repo
          token: ${{ secrets.SDK_REPO_TOKEN }}

      - name: Copy generated SDK
        env:
          SDK_DIR: ${{ steps.generate.outputs.sdk-dir }}
        run: rsync -a --delete --exclude .git "$SDK_DIR/" ./sdk-repo/

      - name: Open PR on SDK repo
        uses: peter-evans/create-pull-request@v7
        with:
          path: ./sdk-repo
          token: ${{ secrets.SDK_REPO_TOKEN }}
          branch: update-sdk
          title: 'chore: update SDK from API spec'
          body: |
            Auto-generated from API spec change in ${{ github.repository }}@${{ github.sha }}.
          commit-message: 'chore: regenerate SDK from ${{ github.repository }}@${{ github.sha }}'
```

If the spec hasn't changed, no PR is created. If a PR already exists, it's updated in place. The SDK repo can have its own CI to run tests before merging.

### Cross-repo dispatch pattern

An alternative approach where the SDK repo owns its own generation. The API repo just signals that the spec has changed, and the SDK repo fetches the spec and generates.

This is useful when:
- The API spec is generated during CI (not checked into the repo)
- You want the SDK repo to control its own generation config (instructions, model, language)
- You want to keep API repo secrets minimal (no `OPPER_API_KEY` needed)

**API repo workflow** (triggers after build):

```yaml
# In your CI workflow, add a job that runs after the spec is built/uploaded
trigger-sdk:
  runs-on: ubuntu-latest
  needs: [build]  # job that uploads openapi spec as artifact
  if: github.ref == 'refs/heads/main' && github.event_name == 'push'
  steps:
    - name: Trigger SDK generation
      env:
        GH_TOKEN: ${{ secrets.SDK_REPO_TOKEN }}
        RUN_ID: ${{ github.run_id }}
        SHA: ${{ github.sha }}
      run: |
        gh api repos/your-org/your-api-sdk/dispatches \
          -f event_type=spec-updated \
          -f "client_payload[run_id]=$RUN_ID" \
          -f "client_payload[sha]=$SHA"
```

**SDK repo workflow** (`generate.yml`):

```yaml
name: Generate SDK
on:
  repository_dispatch:
    types: [spec-updated]
  workflow_dispatch:

jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Download OpenAPI spec from API CI
        env:
          GH_TOKEN: ${{ secrets.API_REPO_TOKEN }}
          RUN_ID: ${{ github.event.client_payload.run_id }}
        run: |
          if [ -n "$RUN_ID" ]; then
            gh run download "$RUN_ID" -n openapi-spec -R your-org/your-api
          else
            gh run download -n openapi-spec -R your-org/your-api
          fi

      - uses: opper-ai/opper-openapi-sdks@v1
        with:
          spec: ./openapi.yaml
          output: ./typescript
          opper-api-key: ${{ secrets.OPPER_API_KEY }}

      - run: rm -f openapi.yaml

      - uses: peter-evans/create-pull-request@v7
        with:
          token: ${{ secrets.API_REPO_TOKEN }}
          branch: update-sdk
          title: 'chore: update TypeScript SDK from API spec'
          body: |
            Auto-generated from spec change in your-org/your-api@${{ github.event.client_payload.sha || 'manual' }}.
          commit-message: 'chore: regenerate TypeScript SDK'
```

**Secrets needed:**
- API repo: `SDK_REPO_TOKEN` — PAT with `contents: write` on the SDK repo (for `repository_dispatch`)
- SDK repo: `API_REPO_TOKEN` — PAT with `actions: read` on the API repo (for artifact download) and `contents: write` + `pull_requests: write` on itself (for PR creation)
- SDK repo: `OPPER_API_KEY` — for SDK generation

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
