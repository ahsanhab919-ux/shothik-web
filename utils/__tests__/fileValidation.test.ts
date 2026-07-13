import { beforeEach, describe, expect, it, vi } from "vitest";

describe("fileValidation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe("validateFile", () => {
    it("accepts a valid PDF by MIME, extension, and signature", async () => {
      const { validateFile } = await import("@/utils/paraphrase/fileValidation");
      const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);
      const file = {
        name: "doc.pdf",
        type: "application/pdf",
        size: pdfBytes.length,
        slice: () => ({
          arrayBuffer: async () => pdfBytes.buffer,
        }),
      } as any;

      const result = await validateFile(file);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("rejects a PDF with invalid signature", async () => {
      const { validateFile } = await import("@/utils/paraphrase/fileValidation");
      const bytes = new Uint8Array([0x00, 0x01, 0x02, 0x03]);
      const file = {
        name: "doc.pdf",
        type: "application/pdf",
        size: bytes.length,
        slice: () => ({
          arrayBuffer: async () => bytes.buffer,
        }),
      } as any;

      const result = await validateFile(file);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("File appears to be corrupted or invalid");
    });

    it("rejects extension mismatch even when signature is valid", async () => {
      const { validateFile } = await import("@/utils/paraphrase/fileValidation");
      const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);
      const file = {
        name: "doc.docx",
        type: "application/pdf",
        size: pdfBytes.length,
        slice: () => ({
          arrayBuffer: async () => pdfBytes.buffer,
        }),
      } as any;

      const result = await validateFile(file);

      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining(["File extension .docx doesn't match file type"]),
      );
    });

    it("reports empty file for zero bytes", async () => {
      const { validateFile } = await import("@/utils/paraphrase/fileValidation");
      const file = new File([new Uint8Array([])], "empty.txt", { type: "text/plain" });

      const result = await validateFile(file);

      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(expect.arrayContaining(["File is empty"]));
    });

    it("reports file-size limit error without requiring full File implementation", async () => {
      const { validateFile } = await import("@/utils/paraphrase/fileValidation");

      const fileLike = {
        name: "big.txt",
        type: "text/plain",
        size: 25 * 1024 * 1024 + 1,
      } as any;

      const result = await validateFile(fileLike);

      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(expect.arrayContaining(["File must be ≤ 25 MB"]));
    });
  });

  describe("sanitizeFileName", () => {
    it("strips tags and replaces dangerous characters", async () => {
      const { sanitizeFileName } = await import("@/utils/paraphrase/fileValidation");
      const result = sanitizeFileName('evil<script>alert(1)</script>:file?.pdf');

      expect(result).not.toContain("<");
      expect(result).not.toContain(">");
      expect(result).not.toContain(":");
      expect(result).not.toContain("?");
      expect(result).toContain(".pdf");
    });

    it("limits sanitized name length while preserving extension", async () => {
      const { sanitizeFileName } = await import("@/utils/paraphrase/fileValidation");
      const longName = `${"a".repeat(300)}.pdf`;
      const result = sanitizeFileName(longName);

      expect(result.length).toBeLessThanOrEqual(255);
      expect(result.endsWith(".pdf")).toBe(true);
    });
  });

  describe("generateFileId", () => {
    it("is stable when Date.now and Math.random are controlled", async () => {
      const { generateFileId } = await import("@/utils/paraphrase/fileValidation");
      vi.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);
      vi.spyOn(Math, "random").mockReturnValue(0.123456789);

      const file = new File([new Uint8Array([1, 2, 3])], "a.txt", { type: "text/plain" });
      const id = generateFileId(file);

      expect(id.startsWith("a.txt-3-1700000000000-")).toBe(true);
      expect(id).toMatch(/^a\.txt-3-1700000000000-[a-z0-9]{9}$/);
    });
  });
});
