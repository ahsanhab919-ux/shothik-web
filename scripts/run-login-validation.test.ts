import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_BASE_URL,
  DEFAULT_BROWSER_MATRIX,
  DEFAULT_BROWSER,
  DEFAULT_REPEAT_EACH,
  assertRepeatEach,
  assertValidUrl,
  buildPlaywrightArgs,
  buildRunnerEnv,
  createRunnerConfig,
  getHelpText,
  getRunnerRootDir,
  isPlaceholder,
  parseArgs,
  resolveRunnerProcessEnv,
  resolveBrowserProjects,
  validateCredentialEnv,
} from "./run-login-validation.mjs";

function env(values: Record<string, string> = {}) {
  return values as NodeJS.ProcessEnv;
}

describe("run-login-validation", () => {
  it("uses defaults when no CLI args or env overrides are provided", () => {
    const args = parseArgs([], env());

    expect(args).toMatchObject({
      baseUrl: DEFAULT_BASE_URL,
      browser: DEFAULT_BROWSER,
      repeatEach: DEFAULT_REPEAT_EACH,
      headed: false,
      extraArgs: [],
    });
  });

  it("parses supported flags and forwards extra Playwright args", () => {
    const args = parseArgs(
      ["--", "--base-url", "https://example.com", "--browser", "firefox-stable", "--repeat-each", "2", "--headed", "--trace=on"],
      env(),
    );

    expect(args).toMatchObject({
      baseUrl: "https://example.com",
      browser: "firefox-stable",
      repeatEach: "2",
      headed: true,
      extraArgs: ["--trace=on"],
    });
  });

  it("supports the default browser matrix", () => {
    const args = parseArgs(["--all-browsers"], env());

    expect(resolveBrowserProjects(args)).toEqual(DEFAULT_BROWSER_MATRIX);
  });

  it("supports comma-separated browser projects and removes duplicates", () => {
    const args = parseArgs(["--browser", "chrome-stable,firefox-stable,chrome-stable"], env());

    expect(resolveBrowserProjects(args)).toEqual(["chrome-stable", "firefox-stable"]);
  });

  it("returns help metadata instead of exiting when help is requested", () => {
    const config = createRunnerConfig(["--help"], env());


    expect(config).toEqual({
      help: true,
      helpText: getHelpText(),
    });
  });

  it("validates URLs and repeat counts", () => {
    expect(() => assertValidUrl("ftp://example.com")).toThrow(/http or https/i);
    expect(() => assertValidUrl("notaurl")).toThrow(/Invalid --base-url value/i);
    expect(() => assertRepeatEach("0")).toThrow(/integer >= 1/i);
    expect(() => assertRepeatEach("abc")).toThrow(/integer >= 1/i);
    expect(() => resolveBrowserProjects({ browser: "unknown-browser" })).toThrow(/Unsupported browser project/i);
  });

  it("detects placeholder smoke credentials", () => {
    expect(isPlaceholder("your-smoke-user@example.com")).toBe(true);
    expect(isPlaceholder("your-password")).toBe(true);
    expect(isPlaceholder("real.user@company.test")).toBe(false);
  });

  it("reports skipped success-path coverage when no smoke credentials are provided", () => {
    expect(validateCredentialEnv(env())).toEqual({
      hasCredentials: false,
      message: "Info: smoke credentials are not set; the successful-login scenario will be skipped.",
    });
  });

  it("requires both smoke credentials together", () => {
    expect(() => validateCredentialEnv(env({ PLAYWRIGHT_SMOKE_EMAIL: "user@example.com" }))).toThrow(
      /must be set together/i,
    );
  });

  it("accepts non-placeholder smoke credentials", () => {
    expect(
      validateCredentialEnv(env({
        PLAYWRIGHT_SMOKE_EMAIL: "qa-login-user@company.test",
        PLAYWRIGHT_SMOKE_PASSWORD: "CorrectHorseBatteryStaple123!",
      })),
    ).toEqual({
      hasCredentials: true,
      message: "Info: smoke credentials detected; the successful-login scenario will run.",
    });
  });

  it("loads smoke credentials and base URL from local env files", () => {
    const tempRoot = mkdtempSync(path.join(os.tmpdir(), "login-runner-env-"));

    try {
      writeFileSync(
        path.join(tempRoot, ".env.local"),
        [
          "PLAYWRIGHT_BASE_URL=https://staging.shothikgpt.com",
          "PLAYWRIGHT_SMOKE_EMAIL=qa-login-user@company.test",
          "PLAYWRIGHT_SMOKE_PASSWORD=CorrectHorseBatteryStaple123!",
          "",
        ].join("\n"),
        "utf8",
      );

      const resolvedEnv = resolveRunnerProcessEnv({
        rootDir: tempRoot,
        processEnv: env(),
        nodeEnv: "development",
      });

      expect(resolvedEnv.PLAYWRIGHT_BASE_URL).toBe("https://staging.shothikgpt.com");
      expect(resolvedEnv.PLAYWRIGHT_SMOKE_EMAIL).toBe("qa-login-user@company.test");
      expect(resolvedEnv.PLAYWRIGHT_SMOKE_PASSWORD).toBe("CorrectHorseBatteryStaple123!");

      const config = createRunnerConfig([], env(), { rootDir: tempRoot, nodeEnv: "development" });
      expect(config.help).toBe(false);
      if (config.help) {
        throw new Error("Expected runtime config.");
      }
      expect(config.args.baseUrl).toBe("https://staging.shothikgpt.com");
      expect(config.credentialStatus).toEqual({
        hasCredentials: true,
        message: "Info: smoke credentials detected; the successful-login scenario will run.",
      });
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it("keeps direct process env values ahead of env-file fallbacks", () => {
    const tempRoot = mkdtempSync(path.join(os.tmpdir(), "login-runner-env-"));

    try {
      writeFileSync(
        path.join(tempRoot, ".env.local"),
        [
          "PLAYWRIGHT_BASE_URL=https://staging.shothikgpt.com",
          "PLAYWRIGHT_SMOKE_EMAIL=file-user@company.test",
          "PLAYWRIGHT_SMOKE_PASSWORD=file-password-123",
          "",
        ].join("\n"),
        "utf8",
      );

      const resolvedEnv = resolveRunnerProcessEnv({
        rootDir: tempRoot,
        processEnv: env({
          PLAYWRIGHT_BASE_URL: "https://www.shothikgpt.com",
          PLAYWRIGHT_SMOKE_EMAIL: "env-user@company.test",
          PLAYWRIGHT_SMOKE_PASSWORD: "env-password-123",
        }),
        nodeEnv: "development",
      });

      expect(resolvedEnv.PLAYWRIGHT_BASE_URL).toBe("https://www.shothikgpt.com");
      expect(resolvedEnv.PLAYWRIGHT_SMOKE_EMAIL).toBe("env-user@company.test");
      expect(resolvedEnv.PLAYWRIGHT_SMOKE_PASSWORD).toBe("env-password-123");
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it("builds the child env and Playwright command", () => {
    const args = parseArgs(["--browser", "chrome-stable,firefox-stable", "--repeat-each", "3", "--headed"], env({
      PLAYWRIGHT_BASE_URL: "https://preview.example.com",
      PLAYWRIGHT_BROWSERS_PATH: "/tmp/custom-browsers",
    }));

    expect(buildRunnerEnv(args, env({
      PLAYWRIGHT_BASE_URL: "https://preview.example.com",
      PLAYWRIGHT_BROWSERS_PATH: "/tmp/custom-browsers",
    }))).toMatchObject({
      PLAYWRIGHT_BASE_URL: "https://preview.example.com",
      PLAYWRIGHT_HTML_OPEN: "never",
      PLAYWRIGHT_BROWSERS_PATH: "/tmp/custom-browsers",
    });

    expect(buildPlaywrightArgs(args)).toEqual([
      "exec",
      "playwright",
      "test",
      "e2e/login-validation.spec.ts",
      "--project=chrome-stable",
      "--project=firefox-stable",
      "--repeat-each=3",
      "--headed",
    ]);
  });

  it("resolves the runner root dir inside the repo", () => {
    expect(getRunnerRootDir()).toContain("shothik-web");
  });
});
