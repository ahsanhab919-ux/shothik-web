import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearRememberedLoginEmail,
  getRememberedLoginEmail,
  saveRememberedLoginEmail,
} from "./auth-login-preferences";

const originalLocalStorage = window.localStorage;

function createControlledStorage({
  failOnSetKeys = [],
  failOnRemoveKeys = [],
}: {
  failOnSetKeys?: string[];
  failOnRemoveKeys?: string[];
} = {}): Storage {
  const store = new Map<string, string>();

  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      if (failOnRemoveKeys.includes(key)) {
        throw new DOMException("Blocked", "SecurityError");
      }
      store.delete(key);
    },
    setItem(key: string, value: string) {
      if (failOnSetKeys.includes(key)) {
        throw new DOMException("Blocked", "SecurityError");
      }
      store.set(key, value);
    },
  };
}

describe("auth-login-preferences", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(window, "localStorage", {
      value: originalLocalStorage,
      configurable: true,
    });
  });

  it("returns an empty string when no remembered email exists", () => {
    expect(getRememberedLoginEmail()).toBe("");
  });

  it("stores and trims the remembered login email", () => {
    saveRememberedLoginEmail(" user@example.com ");

    expect(getRememberedLoginEmail()).toBe("user@example.com");
  });

  it("clears the remembered login email", () => {
    saveRememberedLoginEmail("user@example.com");
    clearRememberedLoginEmail();

    expect(getRememberedLoginEmail()).toBe("");
  });

  it("ignores storage write failures when saving the remembered email", () => {
    Object.defineProperty(window, "localStorage", {
      value: createControlledStorage({
        failOnSetKeys: ["shothik_remembered_login_email"],
      }),
      configurable: true,
    });

    expect(() => saveRememberedLoginEmail(" user@example.com ")).not.toThrow();
    expect(getRememberedLoginEmail()).toBe("");
  });

  it("ignores storage remove failures when clearing the remembered email", () => {
    Object.defineProperty(window, "localStorage", {
      value: createControlledStorage({
        failOnRemoveKeys: ["shothik_remembered_login_email"],
      }),
      configurable: true,
    });

    expect(() => clearRememberedLoginEmail()).not.toThrow();
  });
});
