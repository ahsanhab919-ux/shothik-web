"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { type CharacterDNA } from "@/lib/nobel-engine";
import { useProjectPersistence } from "@/hooks/useProjectPersistence";

type ProjectWithSettings = {
  settings?: Record<string, unknown>;
};

function normalizeCharacters(value: unknown): CharacterDNA[] {
  return Array.isArray(value) ? (value as CharacterDNA[]) : [];
}

export function useProjectCharacters(projectId?: string) {
  const { loadProjectById, saveProjectDraft } = useProjectPersistence(projectId);
  const [characters, setCharacters] = useState<CharacterDNA[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(projectId));
  const settingsRef = useRef<Record<string, unknown>>({});

  const refreshCharacters = useCallback(async () => {
    if (!projectId) {
      settingsRef.current = {};
      setCharacters([]);
      setIsLoading(false);
      return [];
    }

    setIsLoading(true);
    try {
      const project = (await loadProjectById()) as ProjectWithSettings | null;
      const settings =
        project?.settings && typeof project.settings === "object" ? project.settings : {};
      settingsRef.current = settings;
      const nextCharacters = normalizeCharacters(settings.characters);
      setCharacters(nextCharacters);
      return nextCharacters;
    } finally {
      setIsLoading(false);
    }
  }, [loadProjectById, projectId]);

  useEffect(() => {
    void refreshCharacters();
  }, [refreshCharacters]);

  const saveCharacters = useCallback(
    async (nextCharacters: CharacterDNA[]) => {
      if (!projectId) {
        throw new Error("Project identifier is required");
      }

      const settings = {
        ...settingsRef.current,
        characters: nextCharacters,
      };

      await saveProjectDraft({
        settings,
      });

      settingsRef.current = settings;
      setCharacters(nextCharacters);
      return nextCharacters;
    },
    [projectId, saveProjectDraft],
  );

  return {
    characters,
    isLoading,
    refreshCharacters,
    saveCharacters,
  };
}
