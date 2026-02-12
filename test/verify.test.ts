import { describe, it, expect } from "vitest";
import { typescript } from "../src/languages/typescript.js";
import { runVerify } from "../src/verify.js";

describe("typescript.verify.parseErrors", () => {
  const parseErrors = typescript.verify!.parseErrors;

  it("parses tsc error output", () => {
    const output = `src/types.ts(10,3): error TS2322: Type 'string' is not assignable to type 'number'.
src/client.ts(25,10): error TS2339: Property 'foo' does not exist on type 'Bar'.`;

    const errors = parseErrors(output);
    expect(errors).toHaveLength(2);
    expect(errors[0]).toEqual({
      file: "src/types.ts",
      line: 10,
      message: "Type 'string' is not assignable to type 'number'.",
    });
    expect(errors[1]).toEqual({
      file: "src/client.ts",
      line: 25,
      message: "Property 'foo' does not exist on type 'Bar'.",
    });
  });

  it("returns empty array for clean output", () => {
    const errors = parseErrors("");
    expect(errors).toEqual([]);
  });

  it("ignores non-error lines", () => {
    const output = `Compiling...
src/types.ts(5,1): error TS1005: ';' expected.
Done in 2.3s`;

    const errors = parseErrors(output);
    expect(errors).toHaveLength(1);
    expect(errors[0].file).toBe("src/types.ts");
  });
});

describe("runVerify", () => {
  it("returns empty array for language without verify", async () => {
    const errors = await runVerify(
      { name: "test", extensions: [], plannerInstructions: "", writerInstructions: "", fileTypes: [] },
      "/tmp"
    );
    expect(errors).toEqual([]);
  });
});
