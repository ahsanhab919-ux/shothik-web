"use client";

import { useState, useEffect, useCallback } from "react";
import { useSelector } from "react-redux";
import {
  getProjects as getLocalProjects,
  createProject as createLocalProject,
  updateProject as updateLocalProject,
  deleteProject as deleteLocalProject,
  getTemplates,
  getDefaultSections,
} from "@/lib/projects-store";

export { getTemplates, getDefaultSections };

interface AuthState {
  auth: {
    user: {
      id?: string;
      clerkId?: string;
      [key: string]: unknown;
    } | null;
  };
}

interface ProjectParams {
  title: string;
  type: string;
  template?: string;
  description?: string;
  settings?: Record<string, unknown>;
  researchNotes?: Record<string, unknown> | null;
  agentChapters?: unknown[] | null;
}

interface ProjectData {
  _id: string;
  title: string;
  type: string;
  template?: string | null;
  description: string;
  content: string;
  sections: unknown[];
  settings: Record<string, unknown>;
  wordCount: number;
  progress: number;
  starred: boolean;
  researchNotes?: Record<string, unknown> | null;
  agentChapters?: unknown[] | null;
  lastEditedAt: number;
  _creationTime: number;
}

interface ProjectUpdates {
  title?: string;
  description?: string;
  content?: string;
  wordCount?: number;
  progress?: number;
  starred?: boolean;
  sections?: unknown[];
  settings?: Record<string, unknown>;
  researchNotes?: Record<string, unknown> | null;
  agentChapters?: unknown[] | null;
}

export function useProjectsStore() {
  const user = useSelector((state: AuthState) => state.auth.user);
  const authUserId = user?.id || user?.clerkId || (user as { _id?: string } | null)?._id || null;

  const [localProjects, setLocalProjects] = useState<ProjectData[]>([]);
  const [remoteProjects, setRemoteProjects] = useState<ProjectData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProjects = useCallback(async () => {
    if (!authUserId) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/projects", {
        credentials: "include",
        cache: "no-store",
      });

      const data = (await response.json().catch(() => null)) as {
        projects?: ProjectData[];
        message?: string;
        error?: string;
      } | null;

      if (!response.ok) {
        throw new Error(data?.message || data?.error || "Failed to load projects");
      }

      setRemoteProjects(data.projects ?? []);
    } catch (error) {
      console.error("[useProjectsStore] load failed:", error);
      setRemoteProjects([]);
    } finally {
      setIsLoading(false);
    }
  }, [authUserId]);

  useEffect(() => {
    if (!authUserId) {
      setLocalProjects(getLocalProjects() as ProjectData[]);
      setIsLoading(false);
      return;
    }

    void fetchProjects();
  }, [authUserId, fetchProjects]);

  const projects = authUserId
    ? remoteProjects
    : localProjects;

  const createProject = useCallback(async (params: ProjectParams): Promise<ProjectData> => {
    const defaultSections = getDefaultSections(params.type);

    if (authUserId) {
      const response = await fetch("/api/projects", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: params.title,
          type: params.type,
          template: params.template || null,
          description: params.description || "",
          sections: defaultSections,
          settings: params.settings || {},
          researchNotes: params.researchNotes ?? null,
          agentChapters: params.agentChapters ?? null,
        }),
      });

      const data = (await response.json().catch(() => null)) as {
        project?: ProjectData;
        message?: string;
        error?: string;
      } | null;

      if (!response.ok || !data?.project) {
        throw new Error(data?.message || data?.error || "Failed to create project");
      }

      setRemoteProjects((current) => [data.project!, ...current]);
      return data.project;
    }

    const project = createLocalProject(params as any);
    setLocalProjects(getLocalProjects() as ProjectData[]);
    return project as ProjectData;
  }, [authUserId]);

  const updateProject = useCallback(async (
    id: string,
    updates: ProjectUpdates
  ) => {
    if (authUserId) {
      const response = await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      });

      const data = (await response.json().catch(() => null)) as {
        project?: ProjectData;
        message?: string;
        error?: string;
      } | null;

      if (!response.ok || !data?.project) {
        throw new Error(data?.message || data?.error || "Failed to update project");
      }

      setRemoteProjects((current) =>
        current.map((project) => (project._id === id ? data.project! : project)),
      );
      return;
    }

    {
      updateLocalProject(id, updates);
      setLocalProjects(getLocalProjects() as ProjectData[]);
    }
  }, [authUserId]);

  const deleteProject = useCallback(async (id: string) => {
    if (authUserId) {
      const response = await fetch(`/api/projects/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          message?: string;
          error?: string;
        } | null;
        throw new Error(data?.message || data?.error || "Failed to delete project");
      }

      setRemoteProjects((current) => current.filter((project) => project._id !== id));
      return;
    }

    {
      deleteLocalProject(id);
      setLocalProjects(getLocalProjects() as ProjectData[]);
    }
  }, [authUserId]);

  return {
    projects,
    isLoading,
    isAuthenticated: !!authUserId,
    createProject,
    updateProject,
    deleteProject,
  };
}
