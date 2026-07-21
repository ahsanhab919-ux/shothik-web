import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BookAgentStart } from '../BookAgentStart';

const mockCreateProject = vi.fn().mockResolvedValue({ _id: 'project-1', title: 'Generated Project' });

vi.mock('framer-motion', () => ({
  motion: new Proxy(
    {},
    {
      get: (_target, tag: string) => {
        const Component = ({ children, ...props }: React.HTMLAttributes<HTMLElement>) =>
          React.createElement(tag, props, children);
        Component.displayName = `motion.${tag}`;
        return Component;
      },
    }
  ),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useReducedMotion: () => true,
}));

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('@/components/common/SvgColor', () => ({
  default: ({ className }: { className?: string }) => <span data-testid="svg-color" className={className} />,
}));

vi.mock('@/i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/hooks/useProjectsStore', () => ({
  useProjectsStore: () => ({
    createProject: mockCreateProject,
  }),
}));

vi.mock('@/lib/debug-log', () => ({
  debugLog: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../SourceIntake', () => ({
  SourceIntake: () => <div>Source intake</div>,
}));

function createSseResponse(events: unknown[]) {
  const body = events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join('');
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(body));
      controller.close();
    },
  });

  return Promise.resolve(
    new Response(stream, {
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' },
    })
  );
}

describe('BookAgentStart', () => {
  beforeEach(() => {
    mockCreateProject.mockClear();
    vi.restoreAllMocks();
  });

  it('shows research guidance when research paper mode is selected', () => {
    render(<BookAgentStart onProjectCreated={vi.fn()} onCancel={vi.fn()} embedded />);

    expect(screen.getByText('Book manuscript plan')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Research Paper/i }));

    expect(screen.getByText('Research paper plan')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Generate a paper structure with sections, thesis framing, methodology cues, and source-aware notes.'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText('Best for journal papers, conference submissions, theses, and literature reviews.')
    ).toBeInTheDocument();
  });

  it('updates selected state and assignment guidance when assignment mode is selected', () => {
    render(<BookAgentStart onProjectCreated={vi.fn()} onCancel={vi.fn()} embedded />);

    const assignmentButton = screen.getByRole('button', { name: /Assignment/i });
    fireEvent.click(assignmentButton);

    return waitFor(() => {
      expect(screen.getByRole('button', { name: /Assignment/i })).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByText('Assignment draft plan')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Turn a prompt or brief into a structured assignment outline with evidence and marking-criteria guidance.'
        )
      ).toBeInTheDocument();
    });

  it('shows a recoverable error when the planner returns an incomplete plan', async () => {
    vi.spyOn(global, 'fetch').mockImplementation(() =>
      createSseResponse([
        { type: 'status', step: 1 },
        { type: 'done', plan: { chapters: [] } },
      ]) as Promise<Response>
    );

    render(<BookAgentStart onProjectCreated={vi.fn()} onCancel={vi.fn()} embedded />);

    fireEvent.change(screen.getByPlaceholderText(/e\.g\., a crime thriller/i), {
      target: { value: 'A detective story set in Dhaka' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Generate plan/i }));

    await waitFor(() => {
      expect(
        screen.getByText('The planner returned an incomplete project structure. Please try again.')
      ).toBeInTheDocument();
    });
    expect(mockCreateProject).not.toHaveBeenCalled();
  });
  });
});
