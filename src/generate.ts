import { mkdir, writeFile, unlink } from "fs/promises";
import { resolve, join, dirname } from "path";
import type { Config } from "./config.js";
import { buildSpecIndex } from "./spec-index.js";
import { readManifest, writeManifest, sha256 } from "./manifest.js";
import type { Manifest } from "./manifest.js";
import { createPlanningAgent } from "./agents/planner.js";
import type { SdkPlan, SdkFile } from "./agents/planner.js";
import { createWriterAgent } from "./agents/writer.js";
import { computeSectionHash } from "./hashing.js";
import { readExistingFiles } from "./existing-sdk.js";
import { runVerify } from "./verify.js";

export async function generate(config: Config): Promise<void> {
  // 1. Parse spec
  console.log(`Parsing spec: ${config.spec}`);
  const specIndex = await buildSpecIndex(config.spec);

  console.log(`API: ${specIndex.info.title} v${specIndex.info.version}`);
  console.log(
    `Tags: ${specIndex.tags.map((t) => t.name).join(", ") || "(none)"}`
  );
  console.log(`Schemas: ${specIndex.schemas.size}`);
  console.log(
    `Endpoints: ${Array.from(specIndex.pathsByTag.values()).reduce((sum, v) => sum + v.length, 0)}`
  );
  console.log(`Language: ${config.language}`);

  const outputDir = resolve(config.output);
  await mkdir(outputDir, { recursive: true });

  // 2. Check if we can skip entirely
  const specHash = sha256(
    JSON.stringify(specIndex, (_key, value) =>
      value instanceof Map ? Array.from(value.entries()) : value
    )
  );
  const instructionsHash = sha256(config.instructions ?? "");
  const manifest = await readManifest(outputDir);

  if (
    !config.force &&
    manifest &&
    manifest.specHash === specHash &&
    manifest.instructionsHash === instructionsHash
  ) {
    console.log("Spec and instructions unchanged. Nothing to regenerate.");
    return;
  }

  const forceAll =
    config.force || !manifest || manifest.instructionsHash !== instructionsHash;

  if (forceAll && !config.force && manifest) {
    console.log("Instructions changed. Regenerating all files.");
  }

  // 3. Read existing SDK files for context
  const existingFiles = await readExistingFiles(
    outputDir,
    config.languageProfile
  );
  const existingPaths = existingFiles.map((f) => f.relativePath);

  // 4. Run planning agent
  console.log("\nPlanning SDK structure...");
  const planner = createPlanningAgent(specIndex, config.languageProfile, {
    instructions: config.instructions,
    model: config.model,
    existingPaths,
  });

  const { result: plan } = await planner.run(
    "Analyze the API spec and create an SDK file plan."
  );

  console.log(`Plan: ${plan.files.length} files`);
  for (const file of plan.files.sort((a, b) => a.order - b.order)) {
    console.log(`  ${file.order}. ${file.id} (${file.outputPath})`);
  }

  // 5. Determine which files need regeneration
  const filesToGenerate = plan.files.filter((file) => {
    if (forceAll) return true;

    const contentHash = computeSectionHash(file, specIndex);
    const cached = manifest?.sections[file.id];

    if (cached && cached.contentHash === contentHash) {
      console.log(`  [cached] ${file.id}`);
      return false;
    }

    return true;
  });

  if (filesToGenerate.length === 0) {
    console.log("\nAll files up to date. Nothing to regenerate.");
    await updateManifest(
      outputDir,
      plan,
      specIndex,
      specHash,
      instructionsHash
    );
    return;
  }

  console.log(`\nGenerating ${filesToGenerate.length} file(s)...`);

  // 6. Generate files in order (respecting dependencies)
  const generatedFiles = new Map<string, string>();

  // Group by order level
  const orderGroups = new Map<number, SdkFile[]>();
  for (const file of filesToGenerate) {
    const group = orderGroups.get(file.order) ?? [];
    group.push(file);
    orderGroups.set(file.order, group);
  }

  const sortedOrders = Array.from(orderGroups.keys()).sort((a, b) => a - b);

  for (const order of sortedOrders) {
    const group = orderGroups.get(order)!;

    const writer = createWriterAgent(specIndex, config.languageProfile, {
      instructions: config.instructions,
      model: config.model,
      existingFiles,
      generatedFiles,
    });

    const writeResults = await Promise.allSettled(
      group.map(async (file) => {
        console.log(`  Writing: ${file.id}...`);
        const { result } = await writer.run({ file, plan });
        return { id: file.id, outputPath: file.outputPath, code: result.code };
      })
    );

    for (const r of writeResults) {
      if (r.status === "fulfilled") {
        generatedFiles.set(r.value.outputPath, r.value.code);
        console.log(`  Done: ${r.value.id}`);
      } else {
        console.error(`  Failed: ${r.reason}`);
      }
    }
  }

  // 7. Write files to disk
  for (const [outputPath, code] of generatedFiles) {
    const filePath = resolve(join(outputDir, outputPath));
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, code + "\n");
    console.log(`  Wrote: ${outputPath}`);
  }

  // 8. Clean up orphaned files from previous plan
  if (manifest) {
    const currentPaths = new Set(plan.files.map((f) => f.outputPath));
    for (const [id, cached] of Object.entries(manifest.sections)) {
      if (!currentPaths.has(cached.outputPath)) {
        const orphanPath = resolve(join(outputDir, cached.outputPath));
        try {
          await unlink(orphanPath);
          console.log(
            `  Removed orphan: ${cached.outputPath} (file "${id}" no longer in plan)`
          );
        } catch {
          // File might already be gone
        }
      }
    }
  }

  // 9. Verification loop
  if (config.verify && config.languageProfile.verify) {
    await runVerifyLoop(config, outputDir, plan, generatedFiles, specIndex);
  }

  // 10. Update manifest
  await updateManifest(
    outputDir,
    plan,
    specIndex,
    specHash,
    instructionsHash
  );

  console.log(`\nGeneration complete. Output: ${outputDir}`);
}

async function runVerifyLoop(
  config: Config,
  outputDir: string,
  plan: SdkPlan,
  generatedFiles: Map<string, string>,
  specIndex: Awaited<ReturnType<typeof buildSpecIndex>>
): Promise<void> {
  const maxAttempts = 2;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`\nVerifying (attempt ${attempt}/${maxAttempts})...`);
    const errors = await runVerify(config.languageProfile, outputDir);

    if (errors.length === 0) {
      console.log("Verification passed.");
      return;
    }

    console.log(`Verification found ${errors.length} error(s).`);

    if (attempt === maxAttempts) {
      console.warn(
        "Max verification attempts reached. Continuing with errors."
      );
      for (const err of errors) {
        console.warn(`  ${err.file}:${err.line}: ${err.message}`);
      }
      return;
    }

    // Group errors by file, feed back to writer for fixing
    const errorsByFile = new Map<string, typeof errors>();
    for (const err of errors) {
      const existing = errorsByFile.get(err.file) ?? [];
      existing.push(err);
      errorsByFile.set(err.file, existing);
    }

    const filesToFix = plan.files.filter((f) =>
      errorsByFile.has(f.outputPath)
    );

    const writer = createWriterAgent(
      specIndex,
      config.languageProfile,
      {
        instructions: config.instructions,
        model: config.model,
        existingFiles: [],
        generatedFiles,
      }
    );

    const fixResults = await Promise.allSettled(
      filesToFix.map(async (file) => {
        const fileErrors = errorsByFile.get(file.outputPath)!;
        const errorContext = fileErrors
          .map((e) => `Line ${e.line}: ${e.message}`)
          .join("\n");
        console.log(`  Fixing: ${file.id} (${fileErrors.length} error(s))...`);
        const { result } = await writer.run({
          file,
          plan,
          fixErrors: errorContext,
        });
        return {
          id: file.id,
          outputPath: file.outputPath,
          code: result.code,
        };
      })
    );

    for (const r of fixResults) {
      if (r.status === "fulfilled") {
        generatedFiles.set(r.value.outputPath, r.value.code);
        // Write fixed file
        const filePath = resolve(join(outputDir, r.value.outputPath));
        await mkdir(dirname(filePath), { recursive: true });
        await writeFile(filePath, r.value.code + "\n");
        console.log(`  Fixed: ${r.value.id}`);
      } else {
        console.error(`  Fix failed: ${r.reason}`);
      }
    }
  }
}

async function updateManifest(
  outputDir: string,
  plan: SdkPlan,
  specIndex: Awaited<ReturnType<typeof buildSpecIndex>>,
  specHash: string,
  instructionsHash: string
): Promise<void> {
  const newManifest: Manifest = {
    version: 1,
    specHash,
    instructionsHash,
    sections: {},
  };

  for (const file of plan.files) {
    newManifest.sections[file.id] = {
      contentHash: computeSectionHash(file, specIndex),
      outputPath: file.outputPath,
      type: file.type,
      order: file.order,
      generatedAt: new Date().toISOString(),
    };
  }

  await writeManifest(outputDir, newManifest);
}
