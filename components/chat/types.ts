export type ChatRole = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  streaming?: boolean;
  error?: boolean;
  timestamp?: number;
  attachments?: ChatAttachment[];
}

export interface ChatAttachment {
  type: string;
  name: string;
  path?: string;
  content?: string;
}

// Persistence adapter: the flagship wires Convex mutations here when the user
// is authenticated. When omitted, useChatStream falls back to localStorage.
export interface ChatPersistence {
  appendMessage: (message: ChatMessage) => void | Promise<unknown>;
}
