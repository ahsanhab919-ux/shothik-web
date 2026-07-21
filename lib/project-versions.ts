import { getProject, updateProject } from "@/lib/projects-store";

const STORAGE_KEY = "shothik_project_versions";

export type LocalProjectVersion = {
  id: string;
  projectId: string;
  content: string;
  sections: unknown[];
  label: string;
  savedAt: number;
};

type VersionStore = Record<string, LocalProjectVersion[]>;

function readStore(): VersionStore {
  if (typeof window === "undefined") return {};

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as VersionStore) : {};
  } catch {
    return {};
  }
}

function writeStore(store: VersionStore) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function generateVersionId() {
  return `version_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function getLocalProjectVersions(projectId: string) {
  const store = readStore();
  return (store[projectId] ?? []).slice().sort((a, b) => b.savedAt - a.savedAt);
}

export function saveLocalProjectVersion(input: {
  projectId: string;
  content: string;
  sections?: unknown[];
  label?: string | null;
}) {
  const store = readStore();
  const versions = store[input.projectId] ?? [];
  const version: LocalProjectVersion = {
    id: generateVersionId(),
    projectId: input.projectId,
    content: input.content,
    sections: input.sections ?? [],
    label: input.label?.trim() || "Manual save",
    savedAt: Date.now(),
  };

  store[input.projectId] = [version, ...versions].slice(0, 20);
  writeStore(store);
  return version;
}

export function restoreLocalProjectVersion(projectId: string, versionId: string) {
  const version = getLocalProjectVersions(projectId).find((entry) => entry.id === versionId);
  if (!version) {
    throw new Error("Project version not found");
  }

  const project = getProject(projectId);
  if (!project) {
    throw new Error("Project not found");
  }

  const restoredProject = updateProject(projectId, {
    content: version.content,
    sections: version.sections,
    wordCount: project.wordCount,
    lastEditedAt: Date.now(),
  });

  saveLocalProjectVersion({
    projectId,
    content: version.content,
    sections: version.sections,
    label: `Restored ${version.label}`,
  });

  return restoredProject;
}
