import type { CreativeStudioHostRuntimeEvidence } from "./host-runtime-validation";
import type { MCPPackageHostTarget } from "./package-scaffold";

export type CreativeStudioHostRuntimeEvidenceCollectionStatus =
  | "captured"
  | "pending_authentication"
  | "pending_package_runtime"
  | "blocked";

export interface CreativeStudioHostRuntimeEvidenceFile {
  schemaVersion: "1.0";
  packageId: "shothik-creative-studio";
  hostTarget: MCPPackageHostTarget;
  collectionStatus: CreativeStudioHostRuntimeEvidenceCollectionStatus;
  collectionMethod: "manual_browser" | "host_runtime" | "hybrid";
  observedAt: string | null;
  observedUrl: string;
  observedTitle?: string;
  blocker?: {
    code:
      | "host_auth_required"
      | "host_package_runtime_unavailable"
      | "host_execution_window_unavailable"
      | "unknown";
    message: string;
  };
  notes?: string[];
  evidence: CreativeStudioHostRuntimeEvidence | null;
}

export interface CreativeStudioHostRuntimeEvidenceCollectionResult {
  evidence: CreativeStudioHostRuntimeEvidence[];
  blockers: string[];
  errors: string[];
}

export function collectCreativeStudioHostRuntimeEvidence(
  files: CreativeStudioHostRuntimeEvidenceFile[],
): CreativeStudioHostRuntimeEvidenceCollectionResult {
  const evidence: CreativeStudioHostRuntimeEvidence[] = [];
  const blockers: string[] = [];
  const errors: string[] = [];

  for (const file of files) {
    if (file.packageId !== "shothik-creative-studio") {
      errors.push(
        `Evidence file for ${file.hostTarget} must match packageId shothik-creative-studio.`,
      );
      continue;
    }

    if (file.collectionStatus === "captured") {
      if (!file.evidence) {
        errors.push(
          `Captured evidence file for ${file.hostTarget} must include evidence payload.`,
        );
        continue;
      }

      if (file.evidence.hostTarget !== file.hostTarget) {
        errors.push(
          `Captured evidence hostTarget mismatch for ${file.hostTarget}.`,
        );
        continue;
      }

      evidence.push(file.evidence);
      continue;
    }

    if (file.evidence) {
      errors.push(
        `Non-captured evidence file for ${file.hostTarget} must not include runtime evidence payload.`,
      );
    }

    if (!file.blocker?.message) {
      errors.push(
        `Non-captured evidence file for ${file.hostTarget} must record a blocker message.`,
      );
      continue;
    }

    blockers.push(`${file.hostTarget}: ${file.blocker.message}`);
  }

  return {
    evidence,
    blockers,
    errors,
  };
}
