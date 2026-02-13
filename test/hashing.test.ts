import { describe, it, expect } from "vitest";
import { buildSpecIndex } from "../src/spec-index.js";
import { computeSectionHash } from "../src/hashing.js";
import type { SdkFile } from "../src/agents/planner.js";
import { resolve } from "path";

const FIXTURE = resolve(import.meta.dirname, "fixtures/petstore.yaml");

function makeFile(overrides: Partial<SdkFile>): SdkFile {
  return {
    id: "test",
    outputPath: "test.ts",
    type: "types",
    description: "Test file",
    order: 0,
    ...overrides,
  };
}

describe("computeSectionHash", () => {
  it("produces consistent hashes for types", async () => {
    const index = await buildSpecIndex(FIXTURE);
    const file = makeFile({ type: "types" });
    const hash1 = computeSectionHash(file, index);
    const hash2 = computeSectionHash(file, index);
    expect(hash1).toBe(hash2);
  });

  it("produces different hashes for different file types", async () => {
    const index = await buildSpecIndex(FIXTURE);
    const types = computeSectionHash(makeFile({ type: "types" }), index);
    const clientBase = computeSectionHash(
      makeFile({ type: "client-base" }),
      index
    );
    const packageConfig = computeSectionHash(
      makeFile({ type: "package-config" }),
      index
    );
    expect(types).not.toBe(clientBase);
    expect(types).not.toBe(packageConfig);
    expect(clientBase).not.toBe(packageConfig);
  });

  it("produces different hashes for different tags", async () => {
    const index = await buildSpecIndex(FIXTURE);
    const pets = computeSectionHash(
      makeFile({ type: "client", relatedTags: ["pets"] }),
      index
    );
    const store = computeSectionHash(
      makeFile({ type: "client", relatedTags: ["store"] }),
      index
    );
    expect(pets).not.toBe(store);
  });

  it("includes referenced schemas in client hash", async () => {
    const index = await buildSpecIndex(FIXTURE);
    const withSchemas = computeSectionHash(
      makeFile({
        type: "client",
        relatedTags: ["pets"],
        relatedSchemas: ["Pet"],
      }),
      index
    );
    const withoutSchemas = computeSectionHash(
      makeFile({
        type: "client",
        relatedTags: ["pets"],
      }),
      index
    );
    expect(withSchemas).not.toBe(withoutSchemas);
  });

  it("hashes index type based on tag list", async () => {
    const index = await buildSpecIndex(FIXTURE);
    const hash = computeSectionHash(makeFile({ type: "index" }), index);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("produces consistent hash for examples covering full spec", async () => {
    const index = await buildSpecIndex(FIXTURE);
    const file = makeFile({ type: "examples" });
    const hash1 = computeSectionHash(file, index);
    const hash2 = computeSectionHash(file, index);
    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[a-f0-9]{64}$/);
  });

  it("produces consistent hash for readme covering full spec", async () => {
    const index = await buildSpecIndex(FIXTURE);
    const file = makeFile({ type: "readme" });
    const hash1 = computeSectionHash(file, index);
    const hash2 = computeSectionHash(file, index);
    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[a-f0-9]{64}$/);

    // readme hash should differ from all other types
    const types = computeSectionHash(makeFile({ type: "types" }), index);
    const clientBase = computeSectionHash(
      makeFile({ type: "client-base" }),
      index
    );
    const packageConfig = computeSectionHash(
      makeFile({ type: "package-config" }),
      index
    );
    const idx = computeSectionHash(makeFile({ type: "index" }), index);
    expect(hash1).not.toBe(types);
    expect(hash1).not.toBe(clientBase);
    expect(hash1).not.toBe(packageConfig);
    expect(hash1).not.toBe(idx);
  });
});
