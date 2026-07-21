import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  buildTestSpriteWorkspaceEnv,
  getTestSpriteEnvFilePaths,
  loadTestSpriteEnv,
  parseInlineEnvContent,
  readTestSpriteApiKeyFromTmpConfig,
  readTestSpriteApiKeyFromWorkspaceConfig,
  resolveTestSpriteApiKey,
  resolveTestSpriteProjectEnv,
  testspriteWorkspaceConfigRelativePath,
} from "../scripts/lib/testsprite-env.mjs";

const tempRoots = [];

function makeTempRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "testsprite-env-"));
  tempRoots.push(root);
  return root;
}

afterEach(() => {
  while (tempRoots.length) {
    fs.rmSync(tempRoots.pop(), { recursive: true, force: true });
  }
});

describe("testsprite env loader", () => {
  it("lists environment-specific files in precedence order", () => {
    const filePaths = getTestSpriteEnvFilePaths("/repo", "test");
    expect(filePaths).toEqual([
      "/repo/.env",
      "/repo/.env.test",
      "/repo/.env.local",
      "/repo/.env.test.local",
      "/repo/.env.testsprite",
      "/repo/.env.testsprite.test",
      "/repo/.env.testsprite.local",
      "/repo/.env.testsprite.test.local",
    ]);
  });

  it("loads env values from generic and testsprite-specific env files", () => {
    const root = makeTempRoot();
    fs.writeFileSync(path.join(root, ".env.local"), "TESTSPRITE_PROJECT_NAME=env-local\n");
    fs.writeFileSync(
      path.join(root, ".env.testsprite.local"),
      "TESTSPRITE_API_KEY=ts_local_key\nPLAYWRIGHT_SMOKE_EMAIL=smoke@example.com\n",
    );

    const envEntries = loadTestSpriteEnv(root, "development");
    expect(envEntries.get("TESTSPRITE_PROJECT_NAME")).toBe("env-local");
    expect(envEntries.get("TESTSPRITE_API_KEY")).toBe("ts_local_key");
    expect(envEntries.get("PLAYWRIGHT_SMOKE_EMAIL")).toBe("smoke@example.com");
  });

  it("prefers process env, then env files, then optional tmp-config fallback for API key resolution", () => {
    const root = makeTempRoot();
    fs.writeFileSync(path.join(root, ".env.testsprite.local"), "TESTSPRITE_API_KEY=file_key\n");
    fs.mkdirSync(path.join(root, "testsprite_tests", "tmp"), { recursive: true });
    fs.writeFileSync(
      path.join(root, "testsprite_tests", "tmp", "config.json"),
      JSON.stringify({
        executionArgs: {
          envs: {
            API_KEY: "tmp_key",
          },
        },
      }),
    );

    expect(
      resolveTestSpriteApiKey({
        rootDir: root,
        processEnv: {
          NODE_ENV: "development",
          TESTSPRITE_API_KEY: "process_key",
        },
      }),
    ).toEqual(
      expect.objectContaining({
        apiKey: "process_key",
        source: "process.env.TESTSPRITE_API_KEY",
      }),
    );

    expect(
      resolveTestSpriteApiKey({
        rootDir: root,
        processEnv: {
          NODE_ENV: "development",
        },
      }),
    ).toEqual(
      expect.objectContaining({
        apiKey: "file_key",
        source: "env files (development)",
        allowTmpConfigFallback: false,
      }),
    );

    fs.rmSync(path.join(root, ".env.testsprite.local"));
    fs.mkdirSync(path.join(root, path.dirname(testspriteWorkspaceConfigRelativePath)), {
      recursive: true,
    });
    fs.writeFileSync(
      path.join(root, testspriteWorkspaceConfigRelativePath),
      JSON.stringify({
        apiKey: "workspace_key",
      }),
    );
    expect(
      resolveTestSpriteApiKey({
        rootDir: root,
        processEnv: {
          NODE_ENV: "development",
        },
      }),
    ).toEqual(
      expect.objectContaining({
        apiKey: "workspace_key",
        source: `workspace profile (${testspriteWorkspaceConfigRelativePath})`,
      }),
    );

    fs.rmSync(path.join(root, testspriteWorkspaceConfigRelativePath));

    expect(
      resolveTestSpriteApiKey({
        rootDir: root,
        processEnv: {
          NODE_ENV: "development",
          TESTSPRITE_ALLOW_TMP_CONFIG_FALLBACK: "true",
        },
      }),
    ).toEqual(
      expect.objectContaining({
        apiKey: "tmp_key",
        source: "tmp config fallback (testsprite_tests/tmp/config.json)",
        allowTmpConfigFallback: true,
      }),
    );
  });

  it("resolves project and smoke config from testsprite env files", () => {
    const root = makeTempRoot();
    fs.writeFileSync(
      path.join(root, ".env.testsprite.local"),
      [
        "TESTSPRITE_PROJECT_URL=https://preview.example.com",
        "TESTSPRITE_PROJECT_NAME=shothik-web-preview",
        "TESTSPRITE_PROJECT_INSTRUCTION=Run preview smoke only",
        "PLAYWRIGHT_SMOKE_EMAIL=smoke@example.com",
        "PLAYWRIGHT_SMOKE_PASSWORD=topsecret",
      ].join("\n"),
    );

    const config = resolveTestSpriteProjectEnv({
      rootDir: root,
      processEnv: {
        NODE_ENV: "development",
      },
    });

    expect(config.projectUrl).toBe("https://preview.example.com");
    expect(config.projectName).toBe("shothik-web-preview");
    expect(config.projectInstruction).toBe("Run preview smoke only");
    expect(config.smokeEmail).toBe("smoke@example.com");
    expect(config.smokePassword).toBe("topsecret");
  });

  it("builds the workspace-local HOME/XDG env for sandbox-safe TestSprite execution", () => {
    const env = buildTestSpriteWorkspaceEnv("/repo", {
      FOO: "bar",
      NODE_ENV: "test",
    });

    expect(env).toEqual(
      expect.objectContaining({
        FOO: "bar",
        HOME: "/repo/.testsprite-home",
        XDG_CONFIG_HOME: "/repo/.testsprite-home/.config",
        XDG_CACHE_HOME: "/repo/.testsprite-home/.cache",
      }),
    );
  });

  it("reads tmp config keys safely and parses inline env content", () => {
    const root = makeTempRoot();
    const configPath = path.join(root, "config.json");
    fs.writeFileSync(
      configPath,
      JSON.stringify({
        executionArgs: {
          envs: {
            API_KEY: "tmp_key",
          },
        },
      }),
    );

    expect(readTestSpriteApiKeyFromTmpConfig(configPath)).toBe("tmp_key");
    expect(readTestSpriteApiKeyFromTmpConfig(path.join(root, "missing.json"))).toBe("");
    expect(
      readTestSpriteApiKeyFromWorkspaceConfig(
        path.join(root, "workspace-config.json"),
      ),
    ).toBe("");

    fs.writeFileSync(
      path.join(root, "workspace-config.json"),
      JSON.stringify({
        apiKey: "workspace_key",
      }),
    );
    expect(
      readTestSpriteApiKeyFromWorkspaceConfig(
        path.join(root, "workspace-config.json"),
      ),
    ).toBe("workspace_key");

    const parsed = parseInlineEnvContent("TESTSPRITE_API_KEY=inline_key\n");
    expect(parsed.get("TESTSPRITE_API_KEY")).toBe("inline_key");
  });
});
