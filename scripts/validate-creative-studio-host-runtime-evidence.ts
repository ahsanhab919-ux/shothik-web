import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { collectCreativeStudioHostRuntimeEvidence, type CreativeStudioHostRuntimeEvidenceFile } from "../lib/mcp/host-runtime-evidence";
import { validateCreativeStudioHostRuntime } from "../lib/mcp/host-runtime-validation";
import {
  buildCreativeStudioPackageManifest,
  type ShothikSunpeakInspectorFixture,
  listCreativeStudioPackageFixtures,
} from "../lib/mcp/package-scaffold";

function main() {
  const rootDir = process.cwd();
  const evidenceDir = path.join(
    rootDir,
    "mcp-packages/creative-studio/runtime-evidence",
  );
  const evidenceFiles = readdirSync(evidenceDir)
    .filter((fileName) => fileName.endsWith(".json"))
    .sort()
    .map((fileName) =>
      JSON.parse(
        readFileSync(path.join(evidenceDir, fileName), "utf8"),
      ) as CreativeStudioHostRuntimeEvidenceFile,
    );

  const collection = collectCreativeStudioHostRuntimeEvidence(evidenceFiles);

  if (collection.errors.length > 0) {
    console.error("Creative Studio host-runtime evidence is invalid:");
    for (const error of collection.errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  if (collection.blockers.length > 0) {
    console.error("Creative Studio host-runtime evidence is blocked:");
    for (const blocker of collection.blockers) {
      console.error(`- ${blocker}`);
    }
    process.exit(1);
  }

  const fixtures = listCreativeStudioPackageFixtures().map(({ path: fixturePath }) => ({
    path: fixturePath,
    fixture: JSON.parse(
      readFileSync(path.join(rootDir, fixturePath), "utf8"),
    ) as ShothikSunpeakInspectorFixture,
  }));

  const result = validateCreativeStudioHostRuntime({
    manifest: buildCreativeStudioPackageManifest(),
    fixtures: fixtures.map((entry) => entry.fixture),
    evidence: collection.evidence,
  });

  if (!result.ok) {
    console.error("Creative Studio host-runtime validation failed:");
    for (const error of result.errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log("Creative Studio host-runtime validation passed.");
}

main();
