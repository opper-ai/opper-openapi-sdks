import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { readExistingFiles } from "../src/existing-sdk.js";
import { mkdir, writeFile, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import type { LanguageProfile } from "../src/languages/language.js";

const testDir = join(tmpdir(), "opper-sdk-test-existing-" + Date.now());

const mockLanguage: Pick<LanguageProfile, "extensions"> = {
  extensions: [".ts", ".json"],
};

beforeEach(async () => {
  await mkdir(join(testDir, "src", "clients"), { recursive: true });
});

afterEach(async () => {
  await rm(testDir, { recursive: true, force: true });
});

describe("readExistingFiles", () => {
  it("reads files matching language extensions", async () => {
    await writeFile(join(testDir, "package.json"), '{"name": "test"}');
    await writeFile(join(testDir, "src", "types.ts"), "export type Foo = {}");

    const files = await readExistingFiles(
      testDir,
      mockLanguage as LanguageProfile
    );
    expect(files).toHaveLength(2);
    expect(files.map((f) => f.relativePath).sort()).toEqual([
      "package.json",
      "src/types.ts",
    ]);
  });

  it("ignores files with non-matching extensions", async () => {
    await writeFile(join(testDir, "README.md"), "# Test");
    await writeFile(join(testDir, "src", "types.ts"), "export type Foo = {}");

    const files = await readExistingFiles(
      testDir,
      mockLanguage as LanguageProfile
    );
    expect(files).toHaveLength(1);
    expect(files[0].relativePath).toBe("src/types.ts");
  });

  it("reads file content", async () => {
    const content = 'export interface Pet { id: string; name: string; }';
    await writeFile(join(testDir, "src", "types.ts"), content);

    const files = await readExistingFiles(
      testDir,
      mockLanguage as LanguageProfile
    );
    expect(files[0].content).toBe(content);
  });

  it("returns empty array for non-existent directory", async () => {
    const files = await readExistingFiles(
      "/tmp/nonexistent-dir-" + Date.now(),
      mockLanguage as LanguageProfile
    );
    expect(files).toEqual([]);
  });

  it("skips node_modules directory", async () => {
    await mkdir(join(testDir, "node_modules", "dep"), { recursive: true });
    await writeFile(
      join(testDir, "node_modules", "dep", "index.ts"),
      "export {}"
    );
    await writeFile(join(testDir, "src", "types.ts"), "export type Foo = {}");

    const files = await readExistingFiles(
      testDir,
      mockLanguage as LanguageProfile
    );
    expect(files).toHaveLength(1);
    expect(files[0].relativePath).toBe("src/types.ts");
  });

  it("returns files sorted by relative path", async () => {
    await writeFile(join(testDir, "src", "types.ts"), "a");
    await writeFile(
      join(testDir, "src", "clients", "pets.ts"),
      "b"
    );
    await writeFile(join(testDir, "package.json"), "c");

    const files = await readExistingFiles(
      testDir,
      mockLanguage as LanguageProfile
    );
    expect(files.map((f) => f.relativePath)).toEqual([
      "package.json",
      "src/clients/pets.ts",
      "src/types.ts",
    ]);
  });
});
