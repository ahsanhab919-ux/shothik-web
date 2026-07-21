'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { AnimatePresence, motion } from 'framer-motion';
import { Download, FileDown, BookOpen, Edit3, Sparkles, Check } from 'lucide-react';
import { ModeSwitcherHeader } from './navigation/ModeSwitcherHeader';
import { LeftSidebar } from './layout/LeftSidebar';
import { ActivityBar } from './layout/ActivityBar';
import { CenterEditor } from './layout/CenterEditor';
import { RightPanel } from './layout/RightPanel';
import { StatusBar } from './layout/StatusBar';
import { CommandPalette } from './CommandPalette';
import { LiveDocumentPreview } from './layout/LiveDocumentPreview';
import { PublishingPage } from './PublishingPage';
import { sanitizeHtml } from '@/lib/sanitize';

const PolishedWriteOnboarding = dynamic(() => import('./PolishedWriteOnboarding').then(m => ({ default: m.PolishedWriteOnboarding })), { ssr: false });
const WebMCPWidget = dynamic(() => import('./WebMCPWidget').then(m => ({ default: m.WebMCPWidget })), { ssr: false });
import { useDocumentBuild } from '@/hooks/useDocumentBuild';
import { useWritingGrammarCheck } from '@/hooks/useWritingGrammarCheck';
import { useUXAnalysis } from '@/hooks/useUXAnalysis';
import { recordSession } from '@/lib/writing-goals';
import { generateReferenceList, countCitations, type CitationStyle } from '@/lib/reference-list';
import { getInterfaceMode, setInterfaceMode, type InterfaceMode } from '@/lib/user-preferences';
import { cn } from '@/lib/utils';
import { debugLog } from '@/lib/debug-log';
import { getWordCount, stripHtml } from '@/lib/writing-utils';
import { computeReadinessScore, GENRE_TARGETS } from '@/lib/projectMetrics';
import { NeuralCouplingEngine } from '@/lib/nobel-engine/NeuralCouplingEngine';
import { NobelImpactEngine } from '@/lib/nobel-engine/NobelImpactEngine';
import { useProjectPersistence } from '@/hooks/useProjectPersistence';

type Mode = 'write' | 'format' | 'publish';
type MobilePanel = 'left' | 'center' | 'right';
const PANEL_ORDER: Record<MobilePanel, number> = { left: 0, center: 1, right: 2 };
const MOBILE_SLIDE_VARIANTS = {
  enter: (dir: number) => ({ x: dir >= 0 ? '100%' : '-100%', opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir >= 0 ? '-100%' : '100%', opacity: 0 }),
};

type ProjectType = 'book' | 'research' | 'assignment';

interface PolishedWriteViewProps {
  bookTitle?: string;
  project?: any;
  onBack?: () => void;
  projectType?: ProjectType;
}

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'info';
}

export function PolishedWriteView({
  bookTitle = 'Untitled Project',
  project,
  projectType: projectTypeProp,
}: PolishedWriteViewProps) {
  const projectType: ProjectType = projectTypeProp || project?.type || 'book';
  const [mode, setMode] = useState<Mode>('write');
  const [title] = useState(project?.title || bookTitle);
  const [content, setContent] = useState<string>(project?.content || '');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const [history, setHistory] = useState<string[]>([project?.content || '']);
  const [historyIndex, setHistoryIndex] = useState(0);
  const lastHistoryContent = useRef(project?.content || '');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [citationStyle, setCitationStyle] = useState<CitationStyle>(
    project?.citationStyle || 'APA'
  );
  const [interfaceMode, setInterfaceModeState] = useState<InterfaceMode>('beginner');
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>('center');
  const [mobilePanelDirection, setMobilePanelDirection] = useState(0);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  useEffect(() => {
    setShowPreview(localStorage.getItem('preview-panel-open') === 'true');
  }, []);

  const togglePreview = useCallback(() => {
    setShowPreview(prev => {
      const next = !prev;
      localStorage.setItem('preview-panel-open', String(next));
      return next;
    });
  }, []);

  const handleMobilePanelChange = useCallback((panel: MobilePanel) => {
    setMobilePanelDirection(PANEL_ORDER[panel] - PANEL_ORDER[mobilePanel]);
    setMobilePanel(panel);
  }, [mobilePanel]);
  const [sidebarView, setSidebarView] = useState<'chapters' | 'search' | 'research' | 'goals'>('chapters');
  const [isAiWriting, setIsAiWriting] = useState(false);
  const [projectSnapshot, setProjectSnapshot] = useState(project);

  const wordCount = getWordCount(content);
  const {
    versions,
    projectStats,
    saveProjectDraft,
    saveProjectVersion,
    restoreProjectVersion,
  } = useProjectPersistence(project?._id || project?.id);

  const { suggestions: grammarSuggestions, isChecking: isGrammarChecking, check: checkGrammar, dismiss: dismissGrammar } = useWritingGrammarCheck();

  const readinessResult = useMemo(() => {
    const hasCitations = /\[[\w\s,\.]+\d{4}\]|\([\w\s,\.]+\d{4}\)|\[\d+\]/.test(content);
    return computeReadinessScore({
      wordCount,
      genreTarget: GENRE_TARGETS[projectType] ?? GENRE_TARGETS.book,
      grammarPassing: grammarSuggestions.length === 0 && wordCount > 50,
      hasCitations,
      hasCoverArt: !!(projectSnapshot?.coverImage || projectSnapshot?.cover),
      hasMetadata: !!(title && title.length > 3 && projectSnapshot?.description),
      hasPricing: !!(projectSnapshot?.price && projectSnapshot.price > 0),
      projectType,
    });
  }, [wordCount, grammarSuggestions.length, content, projectSnapshot, title, projectType]);
  const neuralScore = useMemo(() => {
    const plainText = stripHtml(content);
    if (plainText.length < 50) return undefined;
    return NeuralCouplingEngine.analyze(plainText).overall;
  }, [content]);

  const nobelImpact = useMemo(() => {
    const plainText = stripHtml(content);
    if (plainText.length < 50) return undefined;
    return NobelImpactEngine.analyze(plainText).overall;
  }, [content]);

  const readingLevel = useMemo(() => {
    const plainText = stripHtml(content);
    const words = plainText.split(/\s+/).filter(Boolean);
    const sentences = plainText.match(/[^.!?]+[.!?]+/g) || [];
    if (words.length < 10 || sentences.length === 0) return undefined;
    const syllables = words.reduce((count, word) => count + (word.match(/[aeiou]/gi) || []).length, 0);
    const avgSentenceLen = words.length / sentences.length;
    const avgSyllables = syllables / words.length;
    const flesch = 206.835 - (1.015 * avgSentenceLen) - (84.6 * avgSyllables);
    if (flesch >= 90) return 'Very Easy';
    if (flesch >= 80) return 'Easy';
    if (flesch >= 70) return 'Fairly Easy';
    if (flesch >= 60) return 'Standard';
    if (flesch >= 50) return 'Fairly Difficult';
    if (flesch >= 30) return 'Difficult';
    return 'Very Difficult';
  }, [content]);

  const uxResult = useUXAnalysis(content);

  const prevGoalReached = useRef(false);

  useEffect(() => {
    setInterfaceModeState(getInterfaceMode());
  }, []);

  const streamFromCowriter = useCallback(async (
    currentText: string,
    mode: string,
    instruction?: string
  ): Promise<string> => {
    debugLog.info('Editor', 'AI co-writer stream started', { mode, hasInstruction: !!instruction });
    const response = await fetch('/api/ai-cowriter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentText, mode, instruction }),
    });
    if (!response.ok || !response.body) throw new Error('AI request failed');
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let result = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      for (const line of chunk.split('\n')) {
        if (!line.startsWith('data: ')) continue;
        try {
          const parsed = JSON.parse(line.slice(6));
          if (parsed.content) result += parsed.content;
        } catch (parseErr) {
          console.error('Failed to parse AI stream chunk:', parseErr);
        }
      }
    }
    debugLog.info('Editor', 'AI co-writer stream completed', { mode, resultLength: result.length });
    return result;
  }, []);

  const showToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  useEffect(() => {
    setProjectSnapshot(project);
  }, [project]);

  useEffect(() => {
    window.__shothikStudio = {
      getContent: () => content,
      setContent: (html: string) => {
        setContent(sanitizeHtml(html));
      },
      appendContent: (html: string) => {
        const nextHtml = sanitizeHtml(html);
        setContent((prev) => `${prev}${prev && nextHtml ? "\n" : ""}${nextHtml}`);
      },
      getBookInfo: () => ({
        title,
        projectId: project?._id || project?.id || "",
        mode,
        wordCount,
      }),
      setMode: (nextMode: string) => {
        if (nextMode === "write" || nextMode === "format" || nextMode === "publish") {
          setMode(nextMode);
        }
      },
    };

    return () => {
      delete window.__shothikStudio;
    };
  }, [content, mode, project?._id, project?.id, title, wordCount]);

  useEffect(() => {
    if (content !== lastHistoryContent.current) {
      lastHistoryContent.current = content;
      setHistory(prev => [...prev.slice(0, historyIndex + 1), content].slice(-50));
      setHistoryIndex(prev => Math.min(prev + 1, 49));
    }
  }, [content]);

  useEffect(() => {
    if (wordCount < 5) return;
    const goalReached = recordSession(wordCount);
    if (goalReached && !prevGoalReached.current) {
      showToast(`Goal reached! ${wordCount.toLocaleString()} words today`, 'success');
      prevGoalReached.current = true;
    }
  }, [wordCount]);

  useEffect(() => {
    if (wordCount < 10) return;
    checkGrammar(stripHtml(content));
  }, [content]);

  const persistDraft = useCallback(async (createVersion = false) => {
    if (!project?._id) return;
    debugLog.info('Editor', 'Autosave triggered', { projectId: project._id, wordCount });
    setIsSaving(true);
    try {
      const savedProject = await saveProjectDraft({
        title,
        content,
        sections: projectSnapshot?.sections,
        wordCount,
        settings: {
          ...(projectSnapshot?.settings ?? {}),
          citationStyle,
        },
        citationStyle,
      });
      setProjectSnapshot(savedProject);
      if (createVersion) {
        await saveProjectVersion({
          content,
          sections: projectSnapshot?.sections,
          label: 'Manual save',
        });
      }
      setLastSaved(new Date());
    } catch (err: any) {
      debugLog.error('Editor', 'Save failed', { error: err.message });
      console.error('Failed to save project:', err);
      showToast('Failed to save — please try again', 'info');
    } finally {
      setIsSaving(false);
    }
  }, [
    citationStyle,
    content,
    project?._id,
    projectSnapshot?.sections,
    projectSnapshot?.settings,
    saveProjectDraft,
    saveProjectVersion,
    showToast,
    title,
    wordCount,
  ]);

  const handleSave = useCallback(() => {
    void persistDraft(true);
  }, [persistDraft]);

  const publishProject = useMemo(
    () => ({
      ...(projectSnapshot ?? project ?? {}),
      _id: projectSnapshot?._id ?? project?._id ?? project?.id,
      id: projectSnapshot?._id ?? project?._id ?? project?.id,
      title,
      content,
      type: projectType,
    }),
    [content, project, projectSnapshot, projectType, title],
  );

  const handleEnterPublishMode = useCallback(() => {
    if (!project?._id) {
      setMode('publish');
      return;
    }

    void persistDraft(false).finally(() => {
      setMode('publish');
    });
  }, [persistDraft, project?._id]);

  const handleModeChange = useCallback(
    (nextMode: Mode) => {
      if (nextMode === 'publish') {
        handleEnterPublishMode();
        return;
      }

      setMode(nextMode);
    },
    [handleEnterPublishMode],
  );

  useEffect(() => {
    if (!project?._id) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void persistDraft(false);
    }, 3000);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [content, title, persistDraft, project?._id]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      const prev = history[newIndex];
      lastHistoryContent.current = prev;
      setContent(prev);
    }
  }, [history, historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      const next = history[newIndex];
      lastHistoryContent.current = next;
      setContent(next);
    }
  }, [history, historyIndex]);

  const handleAppendContent = useCallback((html: string) => {
    setContent(prev => prev + html);
  }, []);

  const handleInterfaceModeChange = useCallback((m: InterfaceMode) => {
    setInterfaceMode(m);
    setInterfaceModeState(m);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        e.stopPropagation();
        setShowCommandPalette(p => !p);
      }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, []);

  const handleAiAction = useCallback(async (actionId: string) => {
    switch (actionId) {
      case 'grammar-check':
        if (content.length > 10) {
          checkGrammar(stripHtml(content));
          showToast('Grammar check running…', 'info');
        }
        break;
      case 'new-chapter':
        setSidebarView('chapters');
        break;
      case 'export-pdf':
      case 'export-epub':
      case 'export-word':
        showToast('Export available in the Format tab', 'info');
        setMode('format');
        break;
      case 'ai-continue':
      case 'continue-writing': {
        if (isAiWriting) return;
        setIsAiWriting(true);
        showToast('Writing…', 'info');
        try {
          const lastChunk = stripHtml(content).slice(-800);
          const result = await streamFromCowriter(lastChunk, 'paragraph');
          if (result.trim()) {
            setContent(prev => prev + `<p>${result.trim()}</p>`);
            showToast('Paragraph added', 'success');
          }
        } catch {
          showToast('Could not reach AI — try again', 'info');
        } finally {
          setIsAiWriting(false);
        }
        break;
      }
      case 'ai-rewrite':
      case 'rewrite-paragraph': {
        if (isAiWriting) return;
        setIsAiWriting(true);
        showToast('Rewriting…', 'info');
        try {
          const lastPTag = content.lastIndexOf('<p>');
          if (lastPTag === -1) {
            showToast('No paragraph found to rewrite', 'info');
            setIsAiWriting(false);
            return;
          }
          const lastParaHtml = content.slice(lastPTag);
          const lastParaText = lastParaHtml.replace(/<[^>]*>/g, '').trim();
          if (!lastParaText) {
            showToast('Last paragraph is empty', 'info');
            setIsAiWriting(false);
            return;
          }
          const result = await streamFromCowriter(
            lastParaText,
            'instruction',
            'Rewrite this paragraph to improve its clarity, flow, and tone. Return only the improved paragraph text, no commentary.'
          );
          if (result.trim()) {
            setContent(content.slice(0, lastPTag) + `<p>${result.trim()}</p>`);
            showToast('Paragraph rewritten', 'success');
          }
        } catch {
          showToast('Could not reach AI — try again', 'info');
        } finally {
          setIsAiWriting(false);
        }
        break;
      }
      default:
        break;
    }
  }, [content, checkGrammar, showToast, isAiWriting, streamFromCowriter]);

  const sidebarChapters = useMemo(() => {
    if (!project?.agentChapters?.length) return undefined;
    return project.agentChapters.map((ch: any, i: number) => ({
      id: ch.id || `ch-${i}`,
      title: ch.title,
      status: 'draft' as const,
      isOpen: i === 0,
      wordCount: 0,
      sections: ch.synopsis
        ? [{ id: `${ch.id || i}-s1`, title: ch.synopsis.length > 80 ? ch.synopsis.slice(0, 80) + '…' : ch.synopsis }]
        : [],
    }));
  }, [project?.agentChapters]);

  const handleCitationStyleChange = useCallback((style: CitationStyle) => {
    setCitationStyle(style);
    if (project?._id) {
      void saveProjectDraft({
        title,
        content,
        sections: projectSnapshot?.sections,
        wordCount,
        settings: {
          ...(projectSnapshot?.settings ?? {}),
          citationStyle: style,
        },
        citationStyle: style,
      }).then((savedProject) => {
        setProjectSnapshot(savedProject);
      }).catch(() => {
        showToast('Failed to update citation style', 'info');
      });
    }
  }, [
    content,
    project?._id,
    projectSnapshot?.sections,
    projectSnapshot?.settings,
    saveProjectDraft,
    showToast,
    title,
    wordCount,
  ]);

  const handleRestoreVersion = useCallback(async (versionId: string) => {
    try {
      const restoredProject = await restoreProjectVersion(versionId);
      if (restoredProject) {
        setProjectSnapshot(restoredProject);
        if (typeof restoredProject.content === 'string') {
          lastHistoryContent.current = restoredProject.content;
          setContent(restoredProject.content);
        }
        if (typeof restoredProject.title === 'string') {
          showToast(`Restored version for ${restoredProject.title}`, 'success');
        } else {
          showToast('Version restored', 'success');
        }
      }
    } catch (error) {
      showToast('Failed to restore version', 'info');
    }
  }, [restoreProjectVersion, showToast]);

  const hasAiOutline = !!(project?.agentChapters?.length);
  const versionItems = useMemo(
    () =>
      versions.map((version) => ({
        id: version.id,
        savedAt: version.savedAt,
        label: version.label,
        preview:
          version.label ||
          version.content.substring(0, 120).replace(/<[^>]*>/g, '') +
            (version.content.length > 120 ? '…' : ''),
        isAISuggestion: false as const,
        status: 'applied' as const,
      })),
    [versions],
  );

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <div data-tour="mode-switcher">
        <ModeSwitcherHeader
          currentMode={mode}
          onModeChange={handleModeChange}
          projectName={title}
          onSave={handleSave}
          canUndo={historyIndex > 0}
          canRedo={historyIndex < history.length - 1}
          onUndo={handleUndo}
          onRedo={handleRedo}
          lastSaved={lastSaved}
          isSaving={isSaving}
          interfaceMode={interfaceMode}
          onInterfaceModeChange={handleInterfaceModeChange}
          onOpenCommandPalette={() => setShowCommandPalette(true)}
          readinessScore={readinessResult.score}
          readinessCriteria={readinessResult.criteria}
        />
      </div>

      {mode === 'write' && (
        <>
          {/* 3-panel layout — collapses to single-panel tabbed view below lg (1024px) */}
          <main className="flex flex-1 overflow-hidden">
            {/* Desktop: show all three panels side by side */}
            <div
              data-tour="chapter-list"
              className="hidden lg:flex lg:flex-none"
            >
              <ActivityBar
                activeView={sidebarView}
                onViewChange={setSidebarView}
                hasResearch={!!(project?.researchNotes)}
                interfaceMode={interfaceMode}
                onInterfaceModeChange={handleInterfaceModeChange}
              />
              <LeftSidebar
                activeView={sidebarView}
                chapters={sidebarChapters}
                researchNotes={project?.researchNotes}
                projectType={projectType}
              />
            </div>

            <div
              data-tour="editor-canvas"
              className="hidden lg:flex flex-1 overflow-hidden"
            >
              <div className={cn('flex flex-col overflow-hidden', showPreview ? 'w-1/2' : 'flex-1')}>
                <CenterEditor
                  content={content}
                  onChange={setContent}
                  chapterTitle={title}
                  onUndo={handleUndo}
                  onRedo={handleRedo}
                  canUndo={historyIndex > 0}
                  canRedo={historyIndex < history.length - 1}
                  onRollbackClick={handleUndo}
                  citationStyle={citationStyle}
                  onAppendContent={handleAppendContent}
                  onTogglePreview={togglePreview}
                  showPreview={showPreview}
                />
              </div>
              {showPreview && (
                <LiveDocumentPreview
                  content={content}
                  title={title}
                  projectType={projectType}
                  className="w-1/2"
                />
              )}
            </div>

            <div
              data-tour="ai-panel"
              className="hidden lg:block"
            >
              <RightPanel
                content={content}
                projectId={project?._id || 'default'}
                projectTitle={title}
                interfaceMode={interfaceMode}
                uxResult={uxResult}
                versions={versionItems}
                onRestoreVersion={handleRestoreVersion}
              />
            </div>

            {/* Mobile/Tablet (<1024px): single-panel with animated transitions */}
            <div className="flex flex-1 overflow-hidden lg:hidden relative">
              <AnimatePresence initial={false} custom={mobilePanelDirection} mode="popLayout">
                {mobilePanel === 'left' && (
                  <motion.div
                    key="mobile-left"
                    custom={mobilePanelDirection}
                    variants={MOBILE_SLIDE_VARIANTS}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ type: 'tween', duration: 0.25, ease: 'easeInOut' }}
                    className="absolute inset-0 flex"
                  >
                    <ActivityBar
                      activeView={sidebarView}
                      onViewChange={setSidebarView}
                      hasResearch={!!(project?.researchNotes)}
                      interfaceMode={interfaceMode}
                      onInterfaceModeChange={handleInterfaceModeChange}
                    />
                    <LeftSidebar
                      activeView={sidebarView}
                      chapters={sidebarChapters}
                      researchNotes={project?.researchNotes}
                      projectType={projectType}
                    />
                  </motion.div>
                )}
                {mobilePanel === 'center' && (
                  <motion.div
                    key="mobile-center"
                    custom={mobilePanelDirection}
                    variants={MOBILE_SLIDE_VARIANTS}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ type: 'tween', duration: 0.25, ease: 'easeInOut' }}
                    className="absolute inset-0 flex flex-col overflow-hidden"
                  >
                    <CenterEditor
                      content={content}
                      onChange={setContent}
                      chapterTitle={title}
                      onUndo={handleUndo}
                      onRedo={handleRedo}
                      canUndo={historyIndex > 0}
                      canRedo={historyIndex < history.length - 1}
                      onRollbackClick={handleUndo}
                      citationStyle={citationStyle}
                      onAppendContent={handleAppendContent}
                    />
                  </motion.div>
                )}
                {mobilePanel === 'right' && (
                  <motion.div
                    key="mobile-right"
                    custom={mobilePanelDirection}
                    variants={MOBILE_SLIDE_VARIANTS}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ type: 'tween', duration: 0.25, ease: 'easeInOut' }}
                    className="absolute inset-0"
                  >
                    <RightPanel
                      content={content}
                      projectId={project?._id || 'default'}
                      projectTitle={title}
                      interfaceMode={interfaceMode}
                      uxResult={uxResult}
                      versions={versionItems}
                      onRestoreVersion={handleRestoreVersion}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </main>

          <StatusBar
            wordCount={wordCount}
            neuralScore={neuralScore}
            nobelImpact={nobelImpact}
            readingLevel={readingLevel}
            totalVersions={projectStats?.totalVersions}
            writingVelocity={projectStats?.velocity}
            estimatedDaysToTarget={projectStats?.estimatedDays}
            grammarSuggestions={grammarSuggestions}
            isGrammarChecking={isGrammarChecking}
            onDismissGrammar={dismissGrammar}
            uxIssueCount={uxResult?.issues.length}
          />

          {/* Mobile bottom tab bar (hidden on lg+ desktop) */}
          <div
            className="lg:hidden fixed bottom-0 inset-x-0 bg-background border-t border-border z-50 flex"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            <button
              onClick={() => handleMobilePanelChange('left')}
              aria-label="Chapters panel"
              aria-pressed={mobilePanel === 'left'}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-1 py-3 min-h-[48px] transition-colors',
                mobilePanel === 'left' ? 'text-brand' : 'text-muted-foreground'
              )}
            >
              <BookOpen className="w-5 h-5" />
              <span className="text-[9px] font-bold uppercase tracking-wide">Chapters</span>
            </button>
            <button
              onClick={() => handleMobilePanelChange('center')}
              aria-label="Write panel"
              aria-pressed={mobilePanel === 'center'}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-1 py-3 min-h-[48px] transition-colors',
                mobilePanel === 'center' ? 'text-brand' : 'text-muted-foreground'
              )}
            >
              <Edit3 className="w-5 h-5" />
              <span className="text-[9px] font-bold uppercase tracking-wide">Write</span>
            </button>
            <button
              onClick={() => handleMobilePanelChange('right')}
              aria-label="AI panel"
              aria-pressed={mobilePanel === 'right'}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-1 py-3 min-h-[48px] transition-colors',
                mobilePanel === 'right' ? 'text-brand' : 'text-muted-foreground'
              )}
            >
              <Sparkles className="w-5 h-5" />
              <span className="text-[9px] font-bold uppercase tracking-wide">AI</span>
            </button>
          </div>
        </>
      )}

      {mode === 'format' && (
        <FormatView
          project={project || { title }}
          content={content}
          citationStyle={citationStyle}
          onCitationStyleChange={handleCitationStyleChange}
          onAppendContent={handleAppendContent}
          onPublish={handleEnterPublishMode}
        />
      )}

      {mode === 'publish' && (
        <PublishingPage
          project={publishProject || { title }}
          onBackToEditor={() => setMode('write')}
          onSaveDraft={handleSave}
        />
      )}

      {/* Command Palette */}
      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        chapters={(project?.agentChapters || []).map((c: any) => ({ id: c.id, title: c.title }))}
        onNavigate={() => {
          setSidebarView('chapters');
          showToast(`Navigated to chapter`, 'info');
        }}
        onAiAction={handleAiAction}
        interfaceMode={interfaceMode}
        onInterfaceModeChange={handleInterfaceModeChange}
      />

      {/* Toasts */}
      <div className="fixed top-20 right-4 z-[100] space-y-2 pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={cn(
              'flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-sm font-medium text-white pointer-events-auto',
              toast.type === 'success' ? 'bg-success' : 'bg-brand'
            )}
          >
            <Check className="w-4 h-4 shrink-0" />
            {toast.message}
          </div>
        ))}
      </div>

      {/* Getting Started onboarding checklist + driver.js tour */}
      <PolishedWriteOnboarding
        wordCount={wordCount}
        hasAiOutline={hasAiOutline}
        hasExported={false}
      />

      {/* WebMCP widget — lets AI agents (Claude Desktop, Cursor, etc.) connect and write directly into this editor */}
      <WebMCPWidget />
    </div>
  );
}

function FormatView({
  project,
  content,
  citationStyle,
  onCitationStyleChange,
  onAppendContent,
  onPublish,
}: {
  project: any;
  content: string;
  citationStyle: CitationStyle;
  onCitationStyleChange: (style: CitationStyle) => void;
  onAppendContent: (html: string) => void;
  onPublish: () => void;
}) {
  const { buildState, startBuild, downloadPdf, resetBuild } = useDocumentBuild();
  const [validationResult, setValidationResult] = useState<{
    hasTitle: boolean;
    wordCount: number;
    meetsMinWords: boolean;
    noEmptyHeadings: boolean;
    passed: boolean;
  } | null>(null);
  const [refListGenerated, setRefListGenerated] = useState(false);
  const [typography, setTypography] = useState<'serif' | 'sans'>('serif');

  const wordCount = getWordCount(content);
  const citationCount = countCitations(content);

  const validateDocument = useCallback(() => {
    const hasTitle = !!project?.title?.trim();
    const meetsMinWords = wordCount >= 300;
    const noEmptyHeadings = !/<h[1-6]>\s*<\/h[1-6]>/i.test(content);
    const passed = hasTitle && meetsMinWords && noEmptyHeadings;
    setValidationResult({ hasTitle, wordCount, meetsMinWords, noEmptyHeadings, passed });
  }, [content, project?.title, wordCount]);

  const handleGenerateRefList = () => {
    const refHtml = generateReferenceList(content, citationStyle);
    if (refHtml) {
      onAppendContent(refHtml);
      setRefListGenerated(true);
    }
  };

  const CITATION_STYLES: CitationStyle[] = ['APA', 'MLA', 'Chicago', 'Harvard'];

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left settings panel */}
      <div className="w-[380px] border-r border-border bg-background overflow-y-auto shrink-0">
        <div className="p-6 space-y-6">
          <div>
            <h1 className="text-lg font-bold mb-1">Format Settings</h1>
            <p className="text-sm text-muted-foreground">Configure for digital or print distribution.</p>
          </div>

          <section className="space-y-4">
            <h3 className="text-sm font-bold text-brand uppercase tracking-wider">Typography</h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setTypography('serif')}
                className={cn(
                  'p-3 rounded-xl transition-colors',
                  typography === 'serif'
                    ? 'border-2 border-brand bg-brand/5 text-brand'
                    : 'border border-border text-muted-foreground hover:border-brand/50'
                )}
              >
                <div className="text-2xl font-serif">Aa</div>
                <div className="text-xs font-medium mt-1">Serif</div>
              </button>
              <button
                onClick={() => setTypography('sans')}
                className={cn(
                  'p-3 rounded-xl transition-colors',
                  typography === 'sans'
                    ? 'border-2 border-brand bg-brand/5 text-brand'
                    : 'border border-border text-muted-foreground hover:border-brand/50'
                )}
              >
                <div className="text-2xl font-sans">Aa</div>
                <div className="text-xs font-medium mt-1">Sans</div>
              </button>
            </div>
          </section>

          {/* Citation Style */}
          <section className="space-y-3">
            <h3 className="text-sm font-bold text-brand uppercase tracking-wider">Citation Style</h3>
            <div className="grid grid-cols-4 gap-1.5">
              {CITATION_STYLES.map(style => (
                <button
                  key={style}
                  onClick={() => onCitationStyleChange(style)}
                  className={cn(
                    'py-2 rounded-lg text-xs font-bold transition-colors',
                    citationStyle === style
                      ? 'bg-brand text-white'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  )}
                >
                  {style}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground">
              New citations will be formatted as {citationStyle}. Current style applies to auto-generated reference list.
            </p>
          </section>

          {/* Reference List */}
          <section className="space-y-3">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">References</h3>
            <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted rounded-lg p-3">
              <span>{citationCount} citation{citationCount !== 1 ? 's' : ''} found</span>
              <span className="font-semibold text-brand">{citationStyle} format</span>
            </div>
            <button
              onClick={handleGenerateRefList}
              disabled={citationCount === 0 || refListGenerated}
              className={cn(
                'w-full p-3 rounded-lg text-sm font-medium transition-colors',
                citationCount === 0
                  ? 'bg-muted text-muted-foreground cursor-not-allowed'
                  : refListGenerated
                  ? 'bg-success/10 text-success border border-success/20'
                  : 'bg-brand text-white hover:bg-brand/90'
              )}
            >
              {refListGenerated ? '✓ Reference List Added' : 'Generate Reference List'}
            </button>
            {citationCount === 0 && (
              <p className="text-[10px] text-muted-foreground">
                Insert citations in the editor first using the Cite button.
              </p>
            )}
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Document Check</h3>
            <button
              onClick={validateDocument}
              className="w-full p-3 bg-muted rounded-lg text-sm font-medium hover:bg-muted/80 transition-colors"
            >
              Run Validation
            </button>
            {validationResult && (
              <div className="space-y-2">
                <CheckRow label="Title present" passed={validationResult.hasTitle} />
                <CheckRow label={`Min 300 words (${validationResult.wordCount} current)`} passed={validationResult.meetsMinWords} />
                <CheckRow label="No empty headings" passed={validationResult.noEmptyHeadings} />
                <div className={cn(
                  'mt-2 p-3 rounded-lg text-xs font-semibold',
                  validationResult.passed
                    ? 'bg-success/10 text-success'
                    : 'bg-destructive/10 text-destructive'
                )}>
                  {validationResult.passed ? '✓ Document is ready for export' : '✗ Address the issues above before exporting'}
                </div>
              </div>
            )}
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Export</h3>
            {buildState.error && (
              <div className="p-3 bg-destructive/10 text-destructive text-xs rounded-lg flex items-start justify-between gap-2">
                <span>{buildState.error}</span>
                <button onClick={resetBuild} className="underline shrink-0">Retry</button>
              </div>
            )}
            {buildState.pdfUrl ? (
              <button
                onClick={downloadPdf}
                className="w-full flex items-center justify-center gap-2 p-3 bg-success text-white rounded-lg text-sm font-medium hover:bg-success/90 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </button>
            ) : (
              <button
                onClick={() => startBuild(content)}
                disabled={buildState.isBuilding}
                className="w-full flex items-center justify-center gap-2 p-3 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <FileDown className="w-4 h-4" />
                {buildState.isBuilding ? `Exporting... (${buildState.status || 'queued'})` : 'Export to PDF'}
              </button>
            )}
          </section>

          <div className="pt-4 border-t border-border">
            <button
              onClick={onPublish}
              className="w-full bg-brand text-white py-3 rounded-lg font-bold shadow-lg shadow-brand/20 hover:bg-brand/90 transition-all"
            >
              Continue to Publish
            </button>
          </div>
        </div>
      </div>

      {/* Document Preview */}
      <div className="flex-1 bg-muted flex items-center justify-center p-8 overflow-auto">
        <div className={cn('w-[420px] aspect-[2/3] bg-card p-12 shadow-2xl overflow-hidden', typography === 'serif' ? 'font-serif' : 'font-sans')}>
          <div className="text-center text-muted-foreground text-xs uppercase tracking-widest mb-16">
            {project?.title}
          </div>
          <div
            className="text-[15px] leading-[1.6] text-justify text-foreground"
            dangerouslySetInnerHTML={{
              __html: sanitizeHtml(content.substring(0, 800)) ||
                '<p style="color:var(--muted-foreground);font-style:italic">Start writing to see a preview here.</p>',
            }}
          />
        </div>
      </div>

      {/* Format Assistant */}
      <div className="w-[280px] border-l border-border bg-background shrink-0">
        <div className="p-4 border-b border-border">
          <span className="font-semibold text-sm">Format Assistant</span>
        </div>
        <div className="p-4 space-y-3">
          <div className="p-3 bg-brand/10 rounded-lg border border-brand/20">
            <div className="text-xs font-bold text-brand mb-1">Recommendation</div>
            <p className="text-xs text-muted-foreground">
              {project?.type === 'research'
                ? `For academic papers, use ${citationStyle} citation format consistently. Generate your reference list before exporting.`
                : project?.type === 'assignment'
                ? 'For assignments, double-spacing is standard. Check your institution guidelines before exporting.'
                : 'For fiction, try 1.3 line height with a readable serif font like Caslon or Garamond.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function CheckRow({ label, passed }: { label: string; passed: boolean }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className={passed ? 'text-success' : 'text-destructive'}>{passed ? '✓' : '✗'}</span>
      <span className={passed ? 'text-foreground' : 'text-muted-foreground'}>{label}</span>
    </div>
  );
}
