import { describe, expect, it } from "vitest";

import sitemap from "./sitemap";

describe("sitemap", () => {
  it("surfaces the public agents landing page instead of the protected chat workspace", () => {
    const entries = sitemap();
    const urls = entries.map((entry) => entry.url);

    expect(urls).toContain("https://www.shothik.ai/agents");
    expect(urls).not.toContain("https://www.shothik.ai/agents/chat");
  });
});
