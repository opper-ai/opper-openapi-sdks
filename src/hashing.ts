import { sha256 } from "./manifest.js";
import type { SpecIndex } from "./spec-index.js";
import type { SdkFile } from "./agents/planner.js";

/**
 * Compute a deterministic content hash for an SDK file based on its type
 * and declared dependencies. Used to determine if a file needs regeneration.
 */
export function computeSectionHash(
  file: SdkFile,
  specIndex: SpecIndex
): string {
  const parts: unknown[] = [];

  switch (file.type) {
    case "package-config":
      parts.push(specIndex.info);
      break;

    case "types": {
      const entries = Array.from(specIndex.schemas.entries()).sort(
        ([a], [b]) => a.localeCompare(b)
      );
      parts.push(entries);
      break;
    }

    case "client-base":
      parts.push(specIndex.security);
      parts.push(specIndex.servers);
      break;

    case "client": {
      const tags = file.relatedTags ?? [];
      for (const tag of tags.toSorted()) {
        parts.push({
          tag,
          endpoints: specIndex.pathsByTag.get(tag) ?? [],
        });
      }
      const schemas = file.relatedSchemas ?? [];
      for (const name of schemas.toSorted()) {
        parts.push({
          schema: name,
          definition: specIndex.schemas.get(name),
        });
      }
      break;
    }

    case "index":
      parts.push(
        Array.from(specIndex.pathsByTag.keys()).sort()
      );
      break;

    case "readme":
      parts.push(specIndex.info);
      parts.push(specIndex.servers);
      parts.push(Array.from(specIndex.pathsByTag.keys()).sort());
      parts.push(
        Array.from(specIndex.schemas.entries()).sort(([a], [b]) =>
          a.localeCompare(b)
        )
      );
      parts.push(specIndex.security);
      break;
  }

  return sha256(JSON.stringify(parts));
}
