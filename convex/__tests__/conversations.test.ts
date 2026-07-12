import { describe, it, expect, beforeEach } from "vitest";

import * as conversations from "../conversations";

/**
 * Exercises the raw Convex handlers (`_handler`) for the chat substrate against
 * a minimal in-memory fake `ctx.db` + `ctx.auth`. Covers create/append/rename/
 * delete/flags, ownership rejection, title-derivation, and message cascade.
 */

type Doc = Record<string, any>;

class FakeQuery {
  private constraints: Record<string, unknown> = {};
  private descending = false;
  constructor(private docs: Doc[]) {}

  withIndex(_name: string, cb?: (q: any) => any) {
    if (cb) {
      const q: any = {
        eq: (field: string, value: unknown) => {
          this.constraints[field] = value;
          return q;
        },
      };
      cb(q);
    }
    return this;
  }

  order(dir: "asc" | "desc") {
    this.descending = dir === "desc";
    return this;
  }

  private matches(doc: Doc) {
    return Object.entries(this.constraints).every(([k, v]) => doc[k] === v);
  }

  async collect() {
    const rows = this.docs
      .filter((d) => this.matches(d))
      .sort((a, b) => a._creationTime - b._creationTime);
    return this.descending ? rows.reverse() : rows;
  }
}

class FakeDb {
  private tables: Record<string, Map<string, Doc>> = {};
  private seq = 0;

  private table(name: string) {
    return (this.tables[name] ??= new Map());
  }

  seed(table: string, doc: Doc): string {
    const id = doc._id ?? `${table}_${this.seq}`;
    const stored = { ...doc, _id: id, _creationTime: doc._creationTime ?? this.seq };
    this.seq += 1;
    this.table(table).set(id, stored);
    return id;
  }

  query(table: string) {
    return new FakeQuery([...this.table(table).values()]);
  }

  async get(id: string) {
    for (const map of Object.values(this.tables)) {
      if (map.has(id)) return map.get(id)!;
    }
    return null;
  }

  async insert(table: string, doc: Doc) {
    return this.seed(table, doc);
  }

  async patch(id: string, fields: Doc) {
    for (const map of Object.values(this.tables)) {
      if (map.has(id)) {
        map.set(id, { ...map.get(id)!, ...fields });
        return;
      }
    }
    throw new Error(`patch: id not found ${id}`);
  }

  async delete(id: string) {
    for (const map of Object.values(this.tables)) {
      if (map.delete(id)) return;
    }
    throw new Error(`delete: id not found ${id}`);
  }

  count(table: string) {
    return this.table(table).size;
  }
}

const USER = "user_123";
const OTHER = "user_999";

function ctxFor(db: FakeDb, subject: string) {
  return {
    db,
    auth: { getUserIdentity: async () => ({ subject }) },
  };
}

function run(fn: any, ctx: any, args: any) {
  return fn._handler(ctx, args);
}

let db: FakeDb;

beforeEach(() => {
  db = new FakeDb();
});

describe("createConversation", () => {
  it("creates with default title when none provided", async () => {
    const id = await run(conversations.createConversation, ctxFor(db, USER), {});
    const doc = await db.get(id);
    expect(doc?.userId).toBe(USER);
    expect(doc?.title).toBe("New chat");
  });

  it("requires authentication", async () => {
    await expect(
      run(conversations.createConversation, { db, auth: { getUserIdentity: async () => null } }, {}),
    ).rejects.toThrow(/Authentication required/);
  });
});

describe("appendMessage (title derivation + updatedAt bump)", () => {
  it("derives the title from the first user message", async () => {
    const id = await run(conversations.createConversation, ctxFor(db, USER), {});
    await run(conversations.appendMessage, ctxFor(db, USER), {
      conversationId: id,
      role: "user",
      content: "How do I prove the Pythagorean theorem step by step in detail please",
    });
    const doc = await db.get(id);
    expect(doc?.title).not.toBe("New chat");
    expect(doc?.title.startsWith("How do I prove the Pythagorean")).toBe(true);
    expect(doc?.title.length).toBeLessThanOrEqual(51); // 50 chars + ellipsis
  });

  it("does not overwrite an existing custom title", async () => {
    const id = await run(conversations.createConversation, ctxFor(db, USER), { title: "Custom" });
    await run(conversations.appendMessage, ctxFor(db, USER), {
      conversationId: id,
      role: "user",
      content: "hello there",
    });
    expect((await db.get(id))?.title).toBe("Custom");
  });

  it("rejects appending to another user's conversation", async () => {
    const id = await run(conversations.createConversation, ctxFor(db, USER), {});
    await expect(
      run(conversations.appendMessage, ctxFor(db, OTHER), {
        conversationId: id,
        role: "user",
        content: "sneaky",
      }),
    ).rejects.toThrow(/Unauthorized/);
  });
});

describe("getConversation (ownership + ordering)", () => {
  it("returns messages ordered by createdAt for the owner", async () => {
    const id = await run(conversations.createConversation, ctxFor(db, USER), {});
    await run(conversations.appendMessage, ctxFor(db, USER), {
      conversationId: id,
      role: "user",
      content: "first",
    });
    await run(conversations.appendMessage, ctxFor(db, USER), {
      conversationId: id,
      role: "assistant",
      content: "second",
    });
    const result = await run(conversations.getConversation, ctxFor(db, USER), { conversationId: id });
    expect(result?.messages.map((m: Doc) => m.content)).toEqual(["first", "second"]);
  });

  it("rejects reading another user's conversation", async () => {
    const id = await run(conversations.createConversation, ctxFor(db, USER), {});
    await expect(
      run(conversations.getConversation, ctxFor(db, OTHER), { conversationId: id }),
    ).rejects.toThrow(/Unauthorized/);
  });
});

describe("listConversations (excludeArchived + search)", () => {
  it("excludes archived by default and honors title search", async () => {
    const a = await run(conversations.createConversation, ctxFor(db, USER), { title: "Physics help" });
    const b = await run(conversations.createConversation, ctxFor(db, USER), { title: "Chemistry notes" });
    await run(conversations.setConversationFlags, ctxFor(db, USER), { conversationId: b, archived: true });

    const active = await run(conversations.listConversations, ctxFor(db, USER), {});
    expect(active.map((c: Doc) => c._id)).toContain(a);
    expect(active.map((c: Doc) => c._id)).not.toContain(b);

    const withArchived = await run(conversations.listConversations, ctxFor(db, USER), {
      includeArchived: true,
    });
    expect(withArchived.length).toBe(2);

    const searched = await run(conversations.listConversations, ctxFor(db, USER), {
      search: "physics",
    });
    expect(searched.map((c: Doc) => c._id)).toEqual([a]);
  });
});

describe("renameConversation", () => {
  it("renames for the owner", async () => {
    const id = await run(conversations.createConversation, ctxFor(db, USER), {});
    await run(conversations.renameConversation, ctxFor(db, USER), { conversationId: id, title: "Renamed" });
    expect((await db.get(id))?.title).toBe("Renamed");
  });

  it("rejects renaming another user's conversation", async () => {
    const id = await run(conversations.createConversation, ctxFor(db, USER), {});
    await expect(
      run(conversations.renameConversation, ctxFor(db, OTHER), { conversationId: id, title: "x" }),
    ).rejects.toThrow(/Unauthorized/);
  });
});

describe("deleteConversation (cascade)", () => {
  it("deletes the conversation and all its messages", async () => {
    const id = await run(conversations.createConversation, ctxFor(db, USER), {});
    await run(conversations.appendMessage, ctxFor(db, USER), {
      conversationId: id,
      role: "user",
      content: "one",
    });
    await run(conversations.appendMessage, ctxFor(db, USER), {
      conversationId: id,
      role: "assistant",
      content: "two",
    });
    expect(db.count("messages")).toBe(2);

    await run(conversations.deleteConversation, ctxFor(db, USER), { conversationId: id });
    expect(await db.get(id)).toBeNull();
    expect(db.count("messages")).toBe(0);
  });

  it("rejects deleting another user's conversation", async () => {
    const id = await run(conversations.createConversation, ctxFor(db, USER), {});
    await expect(
      run(conversations.deleteConversation, ctxFor(db, OTHER), { conversationId: id }),
    ).rejects.toThrow(/Unauthorized/);
  });
});

describe("setConversationFlags", () => {
  it("sets pinned and archived flags for the owner", async () => {
    const id = await run(conversations.createConversation, ctxFor(db, USER), {});
    await run(conversations.setConversationFlags, ctxFor(db, USER), {
      conversationId: id,
      pinned: true,
    });
    expect((await db.get(id))?.pinned).toBe(true);
    await run(conversations.setConversationFlags, ctxFor(db, USER), {
      conversationId: id,
      archived: true,
    });
    expect((await db.get(id))?.archived).toBe(true);
  });

  it("rejects flag changes on another user's conversation", async () => {
    const id = await run(conversations.createConversation, ctxFor(db, USER), {});
    await expect(
      run(conversations.setConversationFlags, ctxFor(db, OTHER), {
        conversationId: id,
        pinned: true,
      }),
    ).rejects.toThrow(/Unauthorized/);
  });
});
