export type ChatSurface =
  | "flagship"
  | "writing-studio"
  | "sheet"
  | "research"
  | "book-agent";

export type ConversationStatus = "active" | "archived" | "deleted";
export type MessageRole = "system" | "user" | "assistant" | "tool";
export type MessageStatus = "streaming" | "completed" | "stopped" | "error";
export type MessageContentFormat = "markdown" | "plain";

export interface ConversationContextRef {
  projectId?: string;
  bookId?: string;
  sheetId?: string;
  researchId?: string;
  localProjectId?: string;
  agentType?: string;
}

export interface ConversationSummary {
  _id: string;
  userId: string;
  surface: ChatSurface;
  title: string;
  status: ConversationStatus;
  pinned: boolean;
  temporary: boolean;
  modelHandle?: string;
  contextRef?: ConversationContextRef;
  lastMessageAt: number;
  lastMessagePreview?: string;
  messageCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface ChatMessage {
  _id: string;
  conversationId: string;
  userId: string;
  role: MessageRole;
  content: string;
  contentFormat: MessageContentFormat;
  status: MessageStatus;
  modelHandle?: string;
  parentMessageId?: string;
  metadata?: {
    tokensUsed?: number;
    latencyMs?: number;
    errorCode?: string;
    citations?: unknown;
    sheetMetadata?: unknown;
    researchMetadata?: unknown;
  };
  createdAt: number;
  updatedAt: number;
}

export interface ListConversationsInput {
  surface?: ChatSurface;
  status?: ConversationStatus;
  includeTemporary?: boolean;
  limit?: number;
}

export interface SearchConversationsInput {
  query: string;
  surface?: ChatSurface;
  limit?: number;
}

export interface CreateConversationInput {
  surface: ChatSurface;
  title?: string;
  modelHandle?: string;
  temporary?: boolean;
  contextRef?: ConversationContextRef;
}

export interface SendMessageInput {
  conversationId?: string;
  surface: ChatSurface;
  content: string;
  modelHandle?: string;
  contextRef?: ConversationContextRef;
  temporary?: boolean;
}
