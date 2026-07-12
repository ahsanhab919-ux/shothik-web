export const DEFAULT_CHAT_MODEL = "gemini-2.5-flash";

// Allow-list of Gemini model ids already referenced across the repo/config.
// Do NOT add models the codebase does not already use.
export const ALLOWED_CHAT_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-2.5-pro",
  "gemini-1.5-pro",
  "gemini-1.5-flash",
] as const;

export function resolveChatModel(model?: unknown): string {
  if (typeof model === "string" && (ALLOWED_CHAT_MODELS as readonly string[]).includes(model)) {
    return model;
  }
  return DEFAULT_CHAT_MODEL;
}
