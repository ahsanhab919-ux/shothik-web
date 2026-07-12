import { describe, it, expect } from "vitest";
import { resolveChatModel, DEFAULT_CHAT_MODEL, ALLOWED_CHAT_MODELS } from "../models";

describe("resolveChatModel (backward-compatible model selection)", () => {
  it("defaults to gemini-2.5-flash when model is absent", () => {
    expect(resolveChatModel(undefined)).toBe("gemini-2.5-flash");
    expect(DEFAULT_CHAT_MODEL).toBe("gemini-2.5-flash");
  });

  it("honors an allow-listed model", () => {
    expect(resolveChatModel("gemini-2.0-flash")).toBe("gemini-2.0-flash");
    expect(resolveChatModel("gemini-2.5-pro")).toBe("gemini-2.5-pro");
  });

  it("falls back to the default for an invalid / unknown model", () => {
    expect(resolveChatModel("gpt-4o")).toBe("gemini-2.5-flash");
    expect(resolveChatModel("")).toBe("gemini-2.5-flash");
    expect(resolveChatModel(42 as unknown)).toBe("gemini-2.5-flash");
  });

  it("only allow-lists gemini ids that the repo already references", () => {
    for (const id of ALLOWED_CHAT_MODELS) {
      expect(id.startsWith("gemini-")).toBe(true);
    }
  });
});
