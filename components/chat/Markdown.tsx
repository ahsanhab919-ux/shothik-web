"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { CodeHighlighter } from "@/components/plagiarism/CodeHighlighter";

interface MarkdownProps {
  content: string;
  className?: string;
}

export function Markdown({ content, className }: MarkdownProps) {
  return (
    <div
      className={cn(
        "prose prose-sm dark:prose-invert max-w-none break-words",
        "prose-p:my-2 prose-pre:my-2 prose-pre:bg-transparent prose-pre:p-0",
        "prose-headings:mt-3 prose-headings:mb-1 prose-ul:my-2 prose-ol:my-2",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ inline, className: codeClass, children, ...props }: any) {
            const match = /language-(\w+)/.exec(codeClass || "");
            const text = String(children).replace(/\n$/, "");
            if (!inline && (match || text.includes("\n"))) {
              return (
                <CodeHighlighter code={text} language={match?.[1]} />
              );
            }
            return (
              <code
                className={cn(
                  "rounded bg-muted px-1.5 py-0.5 text-[0.85em]",
                  codeClass,
                )}
                {...props}
              >
                {children}
              </code>
            );
          },
          a({ children, ...props }: any) {
            return (
              <a target="_blank" rel="noopener noreferrer" {...props}>
                {children}
              </a>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
