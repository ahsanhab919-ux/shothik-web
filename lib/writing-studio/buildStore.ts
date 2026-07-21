import { writeFileSync, readFileSync, existsSync, mkdirSync } from "fs";
import path from "path";
import {
  createRenderJob,
  getRenderJobByBuildId,
  updateRenderJob,
} from "@/lib/publishing/insforge-render-service";
import logger from "@/lib/logger";

export interface BuildRecord {
  buildId: string;
  userId?: string;
  status: "queued" | "processing" | "completed" | "failed";
  content?: string;
  pdfUrl?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

const STORE_DIR = "/tmp/writing-studio-builds";

function ensureDir() {
  if (!existsSync(STORE_DIR)) {
    mkdirSync(STORE_DIR, { recursive: true });
  }
}

function buildPath(buildId: string): string {
  return path.join(STORE_DIR, `${buildId}.json`);
}

export function createBuild(
  buildId: string,
  content: string,
  metadata?: Record<string, unknown>,
  userId?: string,
): BuildRecord {
  ensureDir();
  const record: BuildRecord = {
    buildId,
    userId,
    status: "queued",
    content,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    metadata,
  };
  writeFileSync(buildPath(buildId), JSON.stringify(record), "utf-8");

  void createRenderJob({
    buildId,
    userId,
    content,
    metadata,
  }).catch((err) => {
    logger.warn("[buildStore] render job create failed", {
      buildId,
      error: err instanceof Error ? err.message : String(err),
    });
  });

  return record;
}

export function getBuild(buildId: string): BuildRecord | undefined {
  const fp = buildPath(buildId);
  if (!existsSync(fp)) return undefined;
  try {
    return JSON.parse(readFileSync(fp, "utf-8"));
  } catch {
    return undefined;
  }
}

export function updateBuild(buildId: string, updates: Partial<BuildRecord>): BuildRecord | undefined {
  const existing = getBuild(buildId);
  if (!existing) return undefined;
  const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
  writeFileSync(buildPath(buildId), JSON.stringify(updated), "utf-8");

  void updateRenderJob({
    buildId,
    status: updates.status,
    pdfUrl: updates.pdfUrl,
    error: updates.error,
  }).catch((err) => {
    logger.warn("[buildStore] render job update failed", {
      buildId,
      error: err instanceof Error ? err.message : String(err),
    });
  });

  return updated;
}

export async function getBuildWithPersistenceFallback(
  buildId: string,
): Promise<BuildRecord | undefined> {
  const local = getBuild(buildId);
  if (local) return local;

  try {
    const remote = await getRenderJobByBuildId(buildId);
    if (!remote) return undefined;
    return remote;
  } catch (err) {
    logger.warn("[buildStore] render job fallback failed", {
      buildId,
      error: err instanceof Error ? err.message : String(err),
    });
    return undefined;
  }
}
