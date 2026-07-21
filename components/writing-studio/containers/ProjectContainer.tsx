'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { ModeSwitcherHeader } from '../navigation/ModeSwitcherHeader';
import { PolishedWriteView } from '../PolishedWriteView';
import { PublishingPage } from '../PublishingPage';
import { FormattingView } from '@/components/tools/writing-studio/workspace/FormattingView';
import { useProjectPersistence } from '@/hooks/useProjectPersistence';

type Mode = 'write' | 'format' | 'publish';

interface ProjectContainerProps {
  projectId?: string;
  initialMode?: Mode;
}

const RESEARCH_SECTIONS = ['abstract', 'intro', 'lit-review', 'methodology', 'results', 'discussion', 'conclusion', 'references'];
const ASSIGNMENT_SECTIONS = ['intro', 'body-1', 'body-2', 'conclusion', 'references'];
const AUTOSAVE_INTERVAL_MS = 30_000;

function collectLocalStorageSections(projectId: string): Record<string, string> {
  const sections: Record<string, string> = {};
  for (const prefix of ['research-draft', 'assignment-draft']) {
    const allSections = prefix === 'research-draft' ? RESEARCH_SECTIONS : ASSIGNMENT_SECTIONS;
    for (const sectionId of allSections) {
      const key = `${prefix}-${projectId}-${sectionId}`;
      const value = localStorage.getItem(key);
      if (value) sections[key] = value;
    }
  }
  return sections;
}

function countWordsInSections(sections: Record<string, string>): number {
  let total = 0;
  for (const html of Object.values(sections)) {
    const div = document.createElement('div');
    div.innerHTML = html;
    const text = div.textContent || '';
    total += text.trim().split(/\s+/).filter(Boolean).length;
  }
  return total;
}

export function ProjectContainer({
  projectId,
  initialMode = 'write',
}: ProjectContainerProps) {
  const [currentMode, setCurrentMode] = useState<Mode>(initialMode);
  const [projectName, setProjectName] = useState('');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [history, setHistory] = useState<string[]>(['']);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [migrationDone, setMigrationDone] = useState(false);
  const [project, setProject] = useState<Record<string, any> | null>(null);

  const isMounted = useRef(true);
  const projectSettingsRef = useRef<Record<string, unknown>>({});
  const { authUserId, loadProjectById, saveProjectDraft } = useProjectPersistence(projectId);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadProject() {
      if (!projectId) {
        setProject(null);
        setProjectName('');
        projectSettingsRef.current = {};
        return;
      }

      const loadedProject = (await loadProjectById()) as Record<string, any> | null;
      if (cancelled) return;

      setProject(loadedProject);

      if (loadedProject?.title) {
        setProjectName(loadedProject.title);
      } else {
        const savedName = localStorage.getItem(`project-name-${projectId}`);
        if (savedName) setProjectName(savedName);
      }

      projectSettingsRef.current =
        loadedProject?.settings && typeof loadedProject.settings === 'object'
          ? loadedProject.settings
          : {};
    }

    void loadProject();

    return () => {
      cancelled = true;
    };
  }, [loadProjectById, projectId]);

  const handleSaveProjectState = useCallback(async () => {
    if (!projectId || isSaving || !isMounted.current) return;

    setIsSaving(true);
    try {
      const sections = collectLocalStorageSections(projectId);
      if (Object.keys(sections).length === 0) {
        return;
      }
      const wordCount = countWordsInSections(sections);
      const flatContent = Object.values(sections).join('\n');
      const nextSettings = {
        ...projectSettingsRef.current,
        legacySectionDrafts: sections,
      };

      const savedProject = await saveProjectDraft({
        title: projectName || undefined,
        content: flatContent,
        wordCount,
        settings: nextSettings,
      });

      projectSettingsRef.current =
        savedProject?.settings && typeof savedProject.settings === 'object'
          ? savedProject.settings
          : nextSettings;
      if (isMounted.current) {
        setProject(savedProject as Record<string, any>);
      }
      if (isMounted.current) setLastSaved(new Date());
    } catch (err) {
      console.error('[ProjectContainer] Save failed:', err);
    } finally {
      if (isMounted.current) setIsSaving(false);
    }
  }, [isSaving, projectId, projectName, saveProjectDraft]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!isSaving) {
        void handleSaveProjectState();
      }
    }, AUTOSAVE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [handleSaveProjectState, isSaving]);

  useEffect(() => {
    if (!projectId || !authUserId || migrationDone) return;
    const migrationKey = `insforge-section-drafts-migrated-${projectId}`;
    if (localStorage.getItem(migrationKey)) {
      setMigrationDone(true);
      return;
    }
    if (!project) return;

    const existingDrafts =
      project.settings &&
      typeof project.settings === 'object' &&
      project.settings.legacySectionDrafts &&
      typeof project.settings.legacySectionDrafts === 'object'
        ? project.settings.legacySectionDrafts
        : null;

    if (existingDrafts) {
      localStorage.setItem(migrationKey, '1');
      setMigrationDone(true);
      return;
    }

    (async () => {
      try {
        const sections = collectLocalStorageSections(projectId);
        if (Object.keys(sections).length === 0) {
          localStorage.setItem(migrationKey, '1');
          setMigrationDone(true);
          return;
        }

        const wordCount = countWordsInSections(sections);
        const flatContent = Object.values(sections).join('\n');
        const nextSettings = {
          ...projectSettingsRef.current,
          legacySectionDrafts: sections,
        };

        const savedProject = await saveProjectDraft({
          content: flatContent,
          wordCount,
          settings: nextSettings,
        });

        projectSettingsRef.current =
          savedProject?.settings && typeof savedProject.settings === 'object'
            ? savedProject.settings
            : nextSettings;
        if (isMounted.current) {
          setProject(savedProject as Record<string, any>);
        }
        localStorage.setItem(migrationKey, '1');
        if (isMounted.current) setMigrationDone(true);
      } catch (err) {
        console.error('[ProjectContainer] Migration failed:', err);
        if (isMounted.current) setMigrationDone(true);
      }
    })();
  }, [authUserId, migrationDone, project, projectId, saveProjectDraft]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) setHistoryIndex((prev) => prev - 1);
  }, [historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) setHistoryIndex((prev) => prev + 1);
  }, [history, historyIndex]);

  const handleModeChange = useCallback(
    (mode: Mode) => {
      void handleSaveProjectState();
      setCurrentMode(mode);
    },
    [handleSaveProjectState]
  );

  return (
    <div className="h-screen flex flex-col bg-zinc-50 dark:bg-brand-canvas">
      <ModeSwitcherHeader
        currentMode={currentMode}
        onModeChange={handleModeChange}
        projectName={projectName}
        onSave={handleSaveProjectState}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onUndo={handleUndo}
        onRedo={handleRedo}
        lastSaved={lastSaved}
        isSaving={isSaving}
      />

      <div className="flex-1 overflow-hidden">
        {currentMode === 'write' && (
          <PolishedWriteView
            bookTitle={projectName}
            project={project ?? ({ _id: projectId, id: projectId, title: projectName, content: '', type: 'book' } as any)}
          />
        )}

        {currentMode === 'format' && (
          <FormattingView
            project={project || { _id: projectId, id: projectId, title: projectName }}
          />
        )}

        {currentMode === 'publish' && (
          <PublishingPage
            project={{ id: projectId, name: projectName }}
            onBackToEditor={() => setCurrentMode('write')}
          />
        )}
      </div>
    </div>
  );
}
