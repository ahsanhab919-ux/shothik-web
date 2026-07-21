"use client";

import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { getProject, updateProject } from "@/lib/projects-store";
import {
  getLocalProjectVersions,
  restoreLocalProjectVersion,
  saveLocalProjectVersion,
  type LocalProjectVersion,
} from "@/lib/project-versions";

type AuthState = {
  auth: {
    user: {
      id?: string;
      clerkId?: string;
      _id?: string;
    } | null;
  };
};

export type ProjectVersionRecord = {
  id: string;
  content: string;
  sections: unknown[];
  label: string;
  savedAt: number;
};

export type ProjectStatsRecord = {
  totalVersions: number;
  wordsWritten: number;
  targetWords: number;
  progress: number;
  velocity: number;
  estimatedDays: number | null;
  lastEdited: number;
};

const LOCAL_TARGET_WORDS: Record<string, number> = {
  book: 80_000,
  research: 8_000,
  assignment: 3_000,
};

function normalizeRemoteVersion(version: {
  _id: string;
  content: string;
  sections?: unknown[];
  label?: string;
  savedAt: number;
}): ProjectVersionRecord {
  return {
    id: version._id,
    content: version.content,
    sections: version.sections ?? [],
    label: version.label ?? "Manual save",
    savedAt: version.savedAt,
  };
}

function normalizeLocalVersion(version: LocalProjectVersion): ProjectVersionRecord {
  return {
    id: version.id,
    content: version.content,
    sections: version.sections ?? [],
    label: version.label,
    savedAt: version.savedAt,
  };
}

export function useProjectPersistence(projectId?: string) {
  const user = useSelector((state: AuthState) => state.auth.user);
  const authUserId = user?.id || user?.clerkId || user?._id || null;

  const [versions, setVersions] = useState<ProjectVersionRecord[]>([]);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);
  const [projectStats, setProjectStats] = useState<ProjectStatsRecord | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  const requestJson = useCallback(
    async <T>(input: string, init?: RequestInit) => {
      const response = await fetch(input, {
        credentials: "include",
        cache: "no-store",
        ...init,
        headers: {
          ...(init?.body ? { "Content-Type": "application/json" } : {}),
          ...(init?.headers ?? {}),
        },
      });

      const data = (await response.json().catch(() => null)) as
        | (T & { message?: string; error?: string })
        | null;

      if (!response.ok) {
        throw new Error(data?.message || data?.error || "Project request failed");
      }

      return data as T;
    },
    [],
  );

  const refreshVersions = useCallback(async () => {
    if (!projectId) {
      setVersions([]);
      return [];
    }

    setIsLoadingVersions(true);
    try {
      if (authUserId) {
        const response = await fetch(`/api/projects/${projectId}/versions`, {
          credentials: "include",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Failed to load project versions");
        }

        const data = (await response.json()) as {
          versions?: Array<{
            _id: string;
            content: string;
            sections?: unknown[];
            label?: string;
            savedAt: number;
          }>;
        };
        const normalized = (data.versions ?? []).map(normalizeRemoteVersion);
        setVersions(normalized);
        return normalized;
      }

      const normalized = getLocalProjectVersions(projectId).map(normalizeLocalVersion);
      setVersions(normalized);
      return normalized;
    } finally {
      setIsLoadingVersions(false);
    }
  }, [authUserId, projectId]);

  useEffect(() => {
    void refreshVersions();
  }, [refreshVersions]);

  const refreshProjectStats = useCallback(async () => {
    if (!projectId) {
      setProjectStats(null);
      return null;
    }

    setIsLoadingStats(true);
    try {
      if (authUserId) {
        const data = await requestJson<ProjectStatsRecord>(`/api/projects/${projectId}/stats`);
        setProjectStats(data);
        return data;
      }

      const project = getProject(projectId);
      if (!project) {
        setProjectStats(null);
        return null;
      }

      const localVersions = getLocalProjectVersions(projectId);
      const firstSavedAt =
        localVersions.length > 0
          ? Math.min(...localVersions.map((entry) => entry.savedAt))
          : project._creationTime || Date.now();
      const daysSinceStart = Math.max(1, Math.floor((Date.now() - firstSavedAt) / 86_400_000));
      const wordsWritten = project.wordCount || 0;
      const targetWords = LOCAL_TARGET_WORDS[project.type] || LOCAL_TARGET_WORDS.book;
      const velocity = Math.round(wordsWritten / daysSinceStart);
      const estimatedDays = velocity > 0 ? Math.ceil(Math.max(0, targetWords - wordsWritten) / velocity) : null;
      const stats = {
        totalVersions: localVersions.length,
        wordsWritten,
        targetWords,
        progress: Math.min(100, Math.round((wordsWritten / Math.max(1, targetWords)) * 100)),
        velocity,
        estimatedDays,
        lastEdited: project.lastEditedAt || Date.now(),
      };
      setProjectStats(stats);
      return stats;
    } finally {
      setIsLoadingStats(false);
    }
  }, [authUserId, projectId, requestJson]);

  useEffect(() => {
    void refreshProjectStats();
  }, [refreshProjectStats]);

  const saveProjectContent = useCallback(
    async (input: {
      content: string;
      sections?: unknown[];
      wordCount?: number;
    }) => {
      if (!projectId) {
        throw new Error("Project identifier is required");
      }

      if (authUserId) {
        const data = await requestJson<{ project: Record<string, unknown> }>(
          `/api/projects/${projectId}/content`,
          {
            method: "POST",
            body: JSON.stringify(input),
          },
        );
        void refreshProjectStats();
        return data.project;
      }

      const updatedProject = updateProject(projectId, input);
      if (!updatedProject) {
        throw new Error("Project not found");
      }
      void refreshProjectStats();
      return updatedProject;
    },
    [authUserId, projectId, refreshProjectStats, requestJson],
  );

  const saveProjectSettings = useCallback(
    async (settings: Record<string, unknown>) => {
      if (!projectId) {
        throw new Error("Project identifier is required");
      }

      if (authUserId) {
        const data = await requestJson<{ project: Record<string, unknown> }>(
          `/api/projects/${projectId}/settings`,
          {
            method: "POST",
            body: JSON.stringify({ settings }),
          },
        );
        return data.project;
      }

      const project = getProject(projectId);
      if (!project) {
        throw new Error("Project not found");
      }

      const updatedProject = updateProject(projectId, {
        settings: {
          ...(project.settings ?? {}),
          ...settings,
        },
      });
      if (!updatedProject) {
        throw new Error("Project not found");
      }
      return updatedProject;
    },
    [authUserId, projectId, requestJson],
  );

  const saveProjectDraft = useCallback(
    async (input: {
      title?: string;
      content?: string;
      sections?: unknown[];
      wordCount?: number;
      settings?: Record<string, unknown>;
      citationStyle?: string;
    }) => {
      if (!projectId) {
        throw new Error("Project identifier is required");
      }

      if (authUserId) {
        let latestProject: Record<string, unknown> | null = null;

        if (input.title !== undefined) {
          const data = await requestJson<{ project: Record<string, unknown> }>(
            `/api/projects/${projectId}`,
            {
              method: "PATCH",
              body: JSON.stringify({ title: input.title }),
            },
          );
          latestProject = data.project;
        }

        if (
          input.content !== undefined ||
          input.sections !== undefined ||
          typeof input.wordCount === "number"
        ) {
          latestProject = await saveProjectContent({
            content: input.content ?? "",
            ...(input.sections !== undefined ? { sections: input.sections } : {}),
            ...(typeof input.wordCount === "number" ? { wordCount: input.wordCount } : {}),
          });
        }

        const nextSettings =
          input.settings || input.citationStyle
            ? {
                ...(input.settings ?? {}),
                ...(input.citationStyle ? { citationStyle: input.citationStyle } : {}),
              }
            : null;

        if (nextSettings) {
          latestProject = await saveProjectSettings(nextSettings);
        }

        if (latestProject) {
          return latestProject;
        }

        const currentProject = authUserId
          ? (
              await requestJson<{ project?: Record<string, unknown> }>(
                `/api/projects/${projectId}`,
              )
            ).project ?? null
          : getProject(projectId);
        if (!currentProject) {
          throw new Error("Failed to save project");
        }
        return currentProject;
      }

      const payload = {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.content !== undefined ? { content: input.content } : {}),
        ...(input.sections !== undefined ? { sections: input.sections } : {}),
        ...(typeof input.wordCount === "number" ? { wordCount: input.wordCount } : {}),
        ...(input.settings ? { settings: input.settings } : {}),
        ...(input.citationStyle ? { citationStyle: input.citationStyle } : {}),
      };

      const updatedProject = updateProject(projectId, payload);
      if (!updatedProject) {
        throw new Error("Project not found");
      }

      void refreshProjectStats();
      return updatedProject;
    },
    [
      authUserId,
      projectId,
      refreshProjectStats,
      requestJson,
      saveProjectContent,
      saveProjectSettings,
    ],
  );

  const saveProjectVersion = useCallback(
    async (input: { content: string; sections?: unknown[]; label?: string | null }) => {
      if (!projectId) {
        throw new Error("Project identifier is required");
      }

      if (authUserId) {
        const response = await fetch(`/api/projects/${projectId}/versions`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(input),
        });

        const data = (await response.json().catch(() => null)) as {
          version?: {
            _id: string;
            content: string;
            sections?: unknown[];
            label?: string;
            savedAt: number;
          };
          message?: string;
          error?: string;
        } | null;

        if (!response.ok || !data?.version) {
          throw new Error(data?.message || data?.error || "Failed to save project version");
        }

        const version = normalizeRemoteVersion(data.version);
        setVersions((current) => [version, ...current].slice(0, 20));
        void refreshProjectStats();
        return version;
      }

      const version = normalizeLocalVersion(
        saveLocalProjectVersion({
          projectId,
          content: input.content,
          sections: input.sections,
          label: input.label,
        }),
      );
      setVersions((current) => [version, ...current].slice(0, 20));
      void refreshProjectStats();
      return version;
    },
    [authUserId, projectId, refreshProjectStats],
  );

  const restoreProjectVersion = useCallback(
    async (versionId: string) => {
      if (!projectId) {
        throw new Error("Project identifier is required");
      }

      if (authUserId) {
        const response = await fetch(`/api/projects/${projectId}/versions/${versionId}/restore`, {
          method: "POST",
          credentials: "include",
        });

        const data = (await response.json().catch(() => null)) as {
          project?: Record<string, unknown>;
          message?: string;
          error?: string;
        } | null;

        if (!response.ok || !data?.project) {
          throw new Error(data?.message || data?.error || "Failed to restore project version");
        }

        await refreshVersions();
        void refreshProjectStats();
        return data.project;
      }

      const restoredProject = restoreLocalProjectVersion(projectId, versionId);
      if (!restoredProject) {
        throw new Error("Project not found");
      }

      setVersions(getLocalProjectVersions(projectId).map(normalizeLocalVersion));
      void refreshProjectStats();
      return restoredProject;
    },
    [authUserId, projectId, refreshProjectStats, refreshVersions],
  );

  const loadProjectById = useCallback(async () => {
    if (!projectId) return null;

    if (authUserId) {
      const response = await fetch(`/api/projects/${projectId}`, {
        credentials: "include",
        cache: "no-store",
      });

      if (!response.ok) {
        return null;
      }

      const data = (await response.json().catch(() => null)) as {
        project?: Record<string, unknown>;
      } | null;

      return data?.project ?? null;
    }

    return getProject(projectId);
  }, [authUserId, projectId]);

  return {
    authUserId,
    versions,
    isLoadingVersions,
    projectStats,
    isLoadingStats,
    refreshVersions,
    refreshProjectStats,
    loadProjectById,
    saveProjectDraft,
    saveProjectContent,
    saveProjectSettings,
    saveProjectVersion,
    restoreProjectVersion,
  };
}
