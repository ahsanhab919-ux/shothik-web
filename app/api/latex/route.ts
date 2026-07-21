import { execFileSync } from "child_process";
import { randomUUID } from "crypto";
import { existsSync } from "fs";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimiter";
import { htmlToLatex } from "@/lib/writing-studio/htmlToLatex";
import { compilePdf } from "@/lib/writing-studio/pdfCompiler";
import { createBuild, updateBuild } from "@/lib/writing-studio/buildStore";
import { stripHtml } from "@/lib/writing-utils";

const BUILD_DIR = "/tmp/writing-studio-builds";
const PORTRAIT_PAGE: [number, number] = [595.28, 841.89];
const LANDSCAPE_PAGE: [number, number] = [841.89, 595.28];

function hasPdfLatex() {
  try {
    execFileSync("pdflatex", ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function wrapText(text: string, maxWidth: number, fontSize: number) {
  const estimatedCharsPerLine = Math.max(
    24,
    Math.floor(maxWidth / (fontSize * 0.52)),
  );
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > estimatedCharsPerLine && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

async function createFallbackPdf(args: {
  buildId: string;
  html: string;
  title?: string;
  author?: string;
  orientation?: "portrait" | "landscape";
}) {
  const buildPath = path.join(BUILD_DIR, `pdf_${args.buildId}`);
  if (!existsSync(buildPath)) {
    await mkdir(buildPath, { recursive: true });
  }

  const pdfPath = path.join(buildPath, "document.pdf");
  const pdfDoc = await PDFDocument.create();
  const pageSize =
    args.orientation === "landscape" ? LANDSCAPE_PAGE : PORTRAIT_PAGE;
  let page = pdfDoc.addPage(pageSize);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const margin = 48;
  const lineHeight = 18;
  const contentWidth = page.getWidth() - margin * 2;
  let cursorY = page.getHeight() - margin;

  if (args.title) {
    page.drawText(args.title, {
      x: margin,
      y: cursorY,
      size: 20,
      font: boldFont,
      color: rgb(0.1, 0.1, 0.1),
    });
    cursorY -= 28;
  }

  if (args.author) {
    page.drawText(`Author: ${args.author}`, {
      x: margin,
      y: cursorY,
      size: 11,
      font,
      color: rgb(0.35, 0.35, 0.35),
    });
    cursorY -= 24;
  }

  const plainText = stripHtml(args.html)
    .replace(/\s+/g, " ")
    .trim();
  const paragraphs = plainText
    ? plainText.split(/\s{2,}/).filter(Boolean)
    : ["This export did not contain any document text."];

  for (const paragraph of paragraphs) {
    const lines = wrapText(paragraph, contentWidth, 12);
    for (const line of lines) {
      if (cursorY <= margin) {
        page = pdfDoc.addPage(pageSize);
        cursorY = page.getHeight() - margin;
      }

      page.drawText(line, {
        x: margin,
        y: cursorY,
        size: 12,
        font,
        color: rgb(0.15, 0.15, 0.15),
      });
      cursorY -= lineHeight;
    }

    cursorY -= 8;
  }

  pdfDoc.setTitle(args.title || "Writing Studio Export");
  if (args.author) {
    pdfDoc.setAuthor(args.author);
  }
  pdfDoc.setProducer("Shothik Writing Studio");
  pdfDoc.setCreator("Shothik Writing Studio");

  const pdfBytes = await pdfDoc.save();
  await writeFile(pdfPath, pdfBytes);

  return {
    pdfPath,
    pdfUrl: `/api/latex/download/${args.buildId}`,
  };
}

export async function POST(request: NextRequest) {
  const identifier =
    request.headers.get("authorization") ||
    request.headers.get("x-forwarded-for") ||
    "anonymous";
  const { allowed, remaining, resetAt } = await checkRateLimit(identifier, {
    windowMs: 60_000,
    maxRequests: 20,
  });
  if (!allowed) {
    return rateLimitResponse(remaining, resetAt);
  }

  const body = (await request.json().catch(() => null)) as
    | {
        html?: string;
        styles?: { orientation?: "portrait" | "landscape" };
        metadata?: { title?: string; author?: string };
      }
    | null;

  if (!body?.html?.trim()) {
    return NextResponse.json({ error: "HTML is required" }, { status: 400 });
  }

  const buildId = randomUUID();
  const compiler = hasPdfLatex() ? "pdflatex" : "pdf-lib";

  createBuild(buildId, body.html, {
    compiler,
    title: body.metadata?.title,
    author: body.metadata?.author,
  });
  updateBuild(buildId, { status: "processing", error: undefined });

  try {
    const result = hasPdfLatex()
      ? await compilePdf(buildId, htmlToLatex(body.html))
      : await createFallbackPdf({
          buildId,
          html: body.html,
          title: body.metadata?.title,
          author: body.metadata?.author,
          orientation: body.styles?.orientation,
        });

    updateBuild(buildId, {
      status: "completed",
      pdfUrl: result.pdfUrl,
      error: undefined,
    });

    return NextResponse.json({
      buildId,
      status: "completed",
      message: `PDF export completed using ${compiler}.`,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "PDF generation failed";
    updateBuild(buildId, {
      status: "failed",
      error: message,
    });

    return NextResponse.json(
      {
        buildId,
        status: "failed",
        message,
      },
      { status: 500 },
    );
  }
}
