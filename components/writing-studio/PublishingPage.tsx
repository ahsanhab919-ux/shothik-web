'use client';

import { ArrowLeft, BookOpen, Save } from 'lucide-react';
import { PublishWizard } from '@/components/tools/writing-studio/workspace/publish/PublishWizard';

interface PublishingPageProps {
  project?: any;
  onBackToEditor?: () => void;
  onSaveDraft?: () => void;
}

export function PublishingPage({ project, onBackToEditor, onSaveDraft }: PublishingPageProps) {
  const resolvedTitle =
    (typeof project?.title === 'string' && project.title.trim()) ||
    (typeof project?.name === 'string' && project.name.trim()) ||
    'Untitled Book';

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-brand-canvas">
      <header className="glass-chrome sticky top-0 z-30 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-brand mb-1">
              <BookOpen className="w-5 h-5" />
              <span className="text-sm font-bold uppercase tracking-wide">
                Publishing Workflow
              </span>
            </div>
            <h1 className="text-xl font-black text-zinc-900 dark:text-white truncate">
              {resolvedTitle}
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Publish mode now reuses the persisted draft workflow and links this
              book to the active writing project.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onBackToEditor}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Editor
            </button>
            {onSaveDraft ? (
              <button
                type="button"
                onClick={onSaveDraft}
                className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <Save className="w-4 h-4" />
                Save Project
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-2 sm:px-4 pb-10">
        <PublishWizard
          bookTitle={resolvedTitle}
          project={project}
          onSubmitSuccess={() => {}}
          editBookId={null}
        />
      </main>
    </div>
  );
}
