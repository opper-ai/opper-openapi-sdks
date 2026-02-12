import { Command } from "commander";
import { loadConfig } from "./config.js";
import { generate } from "./generate.js";

const program = new Command();

program
  .name("opper-openapi-sdks")
  .description("Generate SDKs from OpenAPI specs using AI agents")
  .version("0.1.0");

program
  .command("generate")
  .description("Generate an SDK from an OpenAPI spec")
  .requiredOption("--spec <path>", "Path to OpenAPI spec file")
  .option("--language <lang>", "Target language", "typescript")
  .option("--output <dir>", "Output directory", "./sdk")
  .option("--instructions <text>", "Custom generation instructions")
  .option("--model <model>", "LLM model to use")
  .option("--force", "Force regenerate all files (ignore cache)")
  .option("--no-verify", "Skip verification step")
  .action(async (options) => {
    try {
      const config = await loadConfig(options);
      await generate(config);
    } catch (err) {
      console.error(
        `Error: ${err instanceof Error ? err.message : String(err)}`
      );
      process.exit(1);
    }
  });

program.parse();
