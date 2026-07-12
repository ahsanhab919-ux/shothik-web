import { describe, expect, it } from "vitest";

import * as conversations from "../conversations";
import * as messages from "../messages";

function exportedNames(mod: Record<string, unknown>) {
  return Object.keys(mod).filter((k) => !k.startsWith("__"));
}

describe("chat substrate module surface", () => {
  it("exports expected conversations functions", () => {
    const names = exportedNames(conversations);
    for (const expected of [
      "createConversation",
      "listConversations",
      "getConversation",
      "renameConversation",
      "deleteConversation",
      "setPinned",
      "setArchived",
      "searchConversations",
    ]) {
      expect(names).toContain(expected);
      expect(typeof (conversations as any)[expected]).toBe("function");
    }
  });

  it("exports expected messages functions", () => {
    const names = exportedNames(messages);
    for (const expected of [
      "addMessage",
      "listMessages",
      "updateMessage",
      "deleteMessage",
    ]) {
      expect(names).toContain(expected);
      expect(typeof (messages as any)[expected]).toBe("function");
    }
  });
});
