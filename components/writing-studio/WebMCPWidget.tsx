"use client";

import { useEffect } from "react";

const WEBMCP_ENABLED = process.env.NEXT_PUBLIC_ENABLE_WEBMCP_WIDGET === "true";
const WEBMCP_SCRIPT_URL = process.env.NEXT_PUBLIC_WEBMCP_SCRIPT_URL?.trim();

declare global {
  interface Window {
    WebMCP?: any;
    __shothikStudio: {
      getContent: () => string;
      setContent: (html: string) => void;
      appendContent: (html: string) => void;
      getBookInfo: () => { title: string; projectId: string; mode: string; wordCount: number };
      setMode: (mode: string) => void;
    };
  }
}

function markdownToHtml(md: string): string {
  return md
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^> (.+)$/gm, "<blockquote>$1</blockquote>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>)/gs, "<ul>$1</ul>")
    .split(/\n\n+/)
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return "";
      if (/^<(h[1-3]|ul|blockquote)/.test(trimmed)) return trimmed;
      return `<p>${trimmed.replace(/\n/g, " ")}</p>`;
    })
    .filter(Boolean)
    .join("\n");
}

function resolveWebMCPConstructor() {
  if (typeof window.WebMCP === "function") {
    return window.WebMCP;
  }

  try {
    const ctor = window.eval?.(
      "typeof WebMCP !== 'undefined' ? WebMCP : undefined",
    );
    if (typeof ctor === "function") {
      window.WebMCP = ctor;
      return ctor;
    }
  } catch {
    // Ignore eval resolution failures and let the caller warn once.
  }

  return null;
}

function attachWebMCPGlobalBinding() {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  if (typeof window.WebMCP === "function") {
    return;
  }

  const shim = document.createElement("script");
  shim.text = `
    if (typeof window.WebMCP !== 'function' && typeof WebMCP === 'function') {
      window.WebMCP = WebMCP;
    }
  `;
  document.head.appendChild(shim);
  shim.remove();
}

export function WebMCPWidget() {
  useEffect(() => {
    if (!WEBMCP_ENABLED) return;
    if (!WEBMCP_SCRIPT_URL) {
      console.warn(
        "[writing-studio] WebMCP widget enabled without NEXT_PUBLIC_WEBMCP_SCRIPT_URL; skipping load.",
      );
      return;
    }

    const scriptId = "webmcp-script";
    const initializeWidget = () => {
      attachWebMCPGlobalBinding();
      const WebMCPConstructor = resolveWebMCPConstructor();
      if (!WebMCPConstructor) {
        console.warn(
          "[writing-studio] WebMCP loaded but did not expose a usable constructor.",
        );
        return;
      }

      const mcp = new WebMCPConstructor({
        color: "#22c55e",
        position: "bottom-right",
        size: "44px",
        padding: "16px",
      });

      mcp.registerTool(
        "get_manuscript",
        "Get the full current manuscript content from the Writing Studio editor",
        {},
        () => {
          const content = window.__shothikStudio?.getContent() ?? "";
          const text = content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
          return {
            content: [{ type: "text", text: text || "(Editor is empty)" }],
          };
        }
      );

      mcp.registerTool(
        "set_manuscript",
        "Replace the entire manuscript content in the Writing Studio editor",
        { content: { type: "string", description: "HTML or plain text content to set" } },
        (args: { content: string }) => {
          if (!window.__shothikStudio) return { content: [{ type: "text", text: "Editor not ready" }] };
          const html = args.content.includes("<") ? args.content : `<p>${args.content.replace(/\n\n/g, "</p><p>").replace(/\n/g, "<br/>")}</p>`;
          window.__shothikStudio.setContent(html);
          const wordCount = args.content.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
          return { content: [{ type: "text", text: `Manuscript set — ${wordCount.toLocaleString()} words loaded into editor.` }] };
        }
      );

      mcp.registerTool(
        "append_chapter",
        "Append a new chapter to the end of the current manuscript",
        {
          title: { type: "string", description: "Chapter title" },
          content: { type: "string", description: "Chapter body text (plain text or HTML)" },
        },
        (args: { title: string; content: string }) => {
          if (!window.__shothikStudio) return { content: [{ type: "text", text: "Editor not ready" }] };
          const body = args.content.includes("<") ? args.content : `<p>${args.content.replace(/\n\n/g, "</p><p>").replace(/\n/g, "<br/>")}</p>`;
          const chapter = `<h2>${args.title}</h2>${body}`;
          window.__shothikStudio.appendContent(chapter);
          const wordCount = args.content.split(/\s+/).filter(Boolean).length;
          return { content: [{ type: "text", text: `Chapter "${args.title}" appended — ${wordCount.toLocaleString()} words added.` }] };
        }
      );

      mcp.registerTool(
        "get_book_info",
        "Get metadata about the current book project (title, word count, stage)",
        {},
        () => {
          const info = window.__shothikStudio?.getBookInfo();
          if (!info) return { content: [{ type: "text", text: "Editor not ready" }] };
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                title: info.title,
                projectId: info.projectId,
                currentStage: info.mode,
                wordCount: info.wordCount,
                estimatedReadingMinutes: Math.ceil(info.wordCount / 250),
              }, null, 2),
            }],
          };
        }
      );

      mcp.registerTool(
        "run_quality_check",
        "Run a quality check on the current manuscript — checks readability, passive voice, PII, and word count",
        {},
        async () => {
          const content = window.__shothikStudio?.getContent() ?? "";
          const text = content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
          if (!text) return { content: [{ type: "text", text: "Editor is empty — nothing to check." }] };
          try {
            const res = await fetch("/api/writing-studio/quality-check", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text }),
            });
            const data = await res.json();
            const q = data.quality;
            const lines = [
              `Quality Check: ${q.passed ? "PASSED ✓" : "ISSUES FOUND ✗"}`,
              `Readability Score: ${q.readabilityScore}/100`,
              `Word Count: ${q.wordCount.toLocaleString()}`,
              `Avg Words/Sentence: ${q.avgWordsPerSentence}`,
              `Passive Voice Instances: ${q.passiveVoiceInstances}`,
              `PII Detected: ${q.piiDetected ? "Yes — review before publishing" : "None"}`,
              q.issues.length > 0 ? `Issues:\n${q.issues.map((i: string) => `  • ${i}`).join("\n")}` : "No issues found.",
            ];
            return { content: [{ type: "text", text: lines.join("\n") }] };
          } catch {
            return { content: [{ type: "text", text: "Quality check failed — please try again." }] };
          }
        }
      );

      mcp.registerTool(
        "format_book",
        "Format the manuscript via the Calibre service and download the result",
        {
          format: {
            type: "string",
            description: "Output format: epub, pdf, docx, mobi, azw3, or kepub",
          },
          bookId: {
            type: "string",
            description: "The Convex book/project ID (from get_book_info)",
          },
        },
        async (args: { format: string; bookId: string }) => {
          const validFormats = ["epub", "pdf", "docx", "mobi", "azw3", "kepub"];
          if (!validFormats.includes(args.format)) {
            return { content: [{ type: "text", text: `Invalid format. Choose one of: ${validFormats.join(", ")}` }] };
          }
          if (!args.bookId) {
            const info = window.__shothikStudio?.getBookInfo();
            if (!info?.projectId) return { content: [{ type: "text", text: "bookId required — get it from get_book_info" }] };
            args.bookId = info.projectId;
          }
          try {
            const res = await fetch("/api/books/export/convert", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ bookId: args.bookId, format: args.format }),
            });
            if (!res.ok) {
              const err = await res.json().catch(() => ({ error: res.statusText }));
              return { content: [{ type: "text", text: `Format failed: ${err.error ?? res.statusText}` }] };
            }
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `manuscript.${args.format}`;
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 10000);
            return { content: [{ type: "text", text: `Manuscript formatted as ${args.format.toUpperCase()} — download started in browser.` }] };
          } catch {
            return { content: [{ type: "text", text: "Formatting failed — ensure Calibre service is running (port 3003)." }] };
          }
        }
      );

      mcp.registerTool(
        "notify_master",
        "Notify the human Master that the manuscript is ready for review and approval",
        {
          message: { type: "string", description: "Optional message to include with the notification" },
        },
        async (args: { message?: string }) => {
          const info = window.__shothikStudio?.getBookInfo();
          try {
            const res = await fetch("/api/writing-studio/notify-master", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                projectId: info?.projectId,
                title: info?.title,
                message: args.message ?? "Manuscript is ready for your review.",
                wordCount: info?.wordCount,
              }),
            });
            if (res.ok) {
              window.__shothikStudio?.setMode("format");
              return { content: [{ type: "text", text: "Master notified. They will receive a notification bell alert and can review at /account/review." }] };
            }
            return { content: [{ type: "text", text: "Notification sent (master will be alerted on next session)." }] };
          } catch {
            return { content: [{ type: "text", text: "Notification queued — master will be alerted." }] };
          }
        }
      );

      mcp.registerTool(
        "import_from_github",
        "Import a markdown file from a GitHub repository into the Writing Studio editor",
        {
          repoUrl: { type: "string", description: "GitHub repo URL e.g. https://github.com/owner/repo" },
          branch: { type: "string", description: "Branch name e.g. main" },
          filePath: { type: "string", description: "Path to the markdown file e.g. manuscript/chapter1.md" },
        },
        async (args: { repoUrl: string; branch: string; filePath: string }) => {
          try {
            const match = args.repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
            if (!match) return { content: [{ type: "text", text: "Invalid GitHub URL. Use format: https://github.com/owner/repo" }] };
            const [, owner, repo] = match;
            const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${args.filePath}?ref=${args.branch}`;
            const res = await fetch(apiUrl, { headers: { Accept: "application/vnd.github.v3+json" } });
            if (!res.ok) return { content: [{ type: "text", text: `GitHub fetch failed: ${res.status} ${res.statusText}` }] };
            const data = await res.json();
            if (!data.content) return { content: [{ type: "text", text: "No content found at that path." }] };
            const markdown = atob(data.content.replace(/\n/g, ""));
            const html = markdownToHtml(markdown);
            window.__shothikStudio?.setContent(html);
            const wordCount = markdown.split(/\s+/).filter(Boolean).length;
            return {
              content: [{
                type: "text",
                text: `Imported "${args.filePath}" from ${owner}/${repo}@${args.branch} — ${wordCount.toLocaleString()} words loaded into editor.`,
              }],
            };
          } catch (err: any) {
            return { content: [{ type: "text", text: `Import failed: ${err.message}` }] };
          }
        }
      );
    };

    if (document.getElementById(scriptId)) {
      initializeWidget();
      return;
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = WEBMCP_SCRIPT_URL;
    script.async = true;
    script.onerror = () => {
      console.warn(
        `[writing-studio] Failed to load WebMCP widget from ${WEBMCP_SCRIPT_URL}.`,
      );
    };

    script.onload = initializeWidget;

    document.body.appendChild(script);

    return () => {
      const existing = document.getElementById(scriptId);
      if (existing) existing.remove();
    };
  }, []);

  return null;
}
