import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildConvexDeployCommand,
  buildConvexEnvSetCommand,
  buildConvexRecoveryEnvValues,
  resolveConvexRecoveryConfig,
  runConvexRecovery,
} from "@/lib/convex-recovery";

describe("convex recovery", () => {
  beforeEach(() => {
    process.env.CONVEX_DEPLOYMENT = "dashing-mandrill-233";
    delete process.env.CONVEX_DEPLOY_KEY;
    delete process.env.NEXT_PUBLIC_CONVEX_URL;
    process.env.CONVEX_EXPECTED_CLOUD_URL = "https://dashing-mandrill-233.convex.cloud";
    process.env.CONVEX_JWT_PUBLIC_KEY_N = "test-modulus";
    process.env.JWT_PRIVATE_KEY = "test-private-key";
    delete process.env.CONVEX_SITE_URL;
  });

  it("resolves the recovery config from the current env", () => {
    const config = resolveConvexRecoveryConfig(process.env, "/workspace/shothik-web");

    expect(config.deployment).toBe("dashing-mandrill-233");
    expect(config.siteUrl).toBe("https://dashing-mandrill-233.convex.site");
    expect(config.functionsDir).toBe("/workspace/shothik-web/convex");
  });

  it("builds the Convex deployment env sync payload from existing values", async () => {
    const config = resolveConvexRecoveryConfig(process.env, "/workspace/shothik-web");
    const envValues = await buildConvexRecoveryEnvValues(config);

    expect(envValues).toEqual({
      CONVEX_JWT_PUBLIC_KEY_N: "test-modulus",
    });
  });

  it("builds the expected Convex env-sync and deploy commands", () => {
    const config = resolveConvexRecoveryConfig(process.env, "/workspace/shothik-web");

    expect(
      buildConvexEnvSetCommand(config, "/tmp/recovery.env", true),
    ).toEqual([
      "pnpm",
      "exec",
      "convex",
      "env",
      "set",
      "--deployment",
      "dashing-mandrill-233",
      "--from-file",
      "/tmp/recovery.env",
      "--force",
    ]);

    expect(buildConvexDeployCommand(config, true)).toEqual([
      "pnpm",
      "exec",
      "convex",
      "deploy",
      "--typecheck",
      "enable",
      "--codegen",
      "enable",
      "--dry-run",
    ]);
  });

  it("omits the deployment flag from env sync when a deploy key is configured", () => {
    process.env.CONVEX_DEPLOY_KEY = "dev:dashing-mandrill-233|deploy-key";

    const config = resolveConvexRecoveryConfig(process.env, "/workspace/shothik-web");

    expect(
      buildConvexEnvSetCommand(config, "/tmp/recovery.env", true),
    ).toEqual([
      "pnpm",
      "exec",
      "convex",
      "env",
      "set",
      "--from-file",
      "/tmp/recovery.env",
      "--force",
    ]);
  });

  it("runs the recovery workflow and reports healthy post-deploy checks", async () => {
    const execFileImpl = vi
      .fn()
      .mockResolvedValueOnce({ stdout: "", stderr: "" })
      .mockResolvedValueOnce({ stdout: "deployed", stderr: "" });

    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/.well-known/openid-configuration")) {
        return new Response(
          JSON.stringify({ issuer: "https://dashing-mandrill-233.convex.site" }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      if (url.endsWith("/.well-known/jwks.json")) {
        return new Response(
          JSON.stringify({ keys: [{ n: "test-modulus", e: "AQAB" }] }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      return new Response("Deployment is running", { status: 200 });
    });

    const result = await runConvexRecovery({
      rootDir: "/Users/user/Pictures/shothik.2/shothik-web",
      execFileImpl: execFileImpl as never,
      fetchImpl: fetchImpl as never,
    });

    expect(result.envSync.updated).toBe(true);
    expect(result.deploy.attempted).toBe(true);
    expect(result.checks.every((check) => check.ok)).toBe(true);
    expect(execFileImpl).toHaveBeenCalledTimes(2);
  });

  it("can skip env sync when deployment env is already managed outside the CLI", async () => {
    const execFileImpl = vi.fn().mockResolvedValueOnce({ stdout: "deployed", stderr: "" });

    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/.well-known/openid-configuration")) {
        return new Response(
          JSON.stringify({ issuer: "https://dashing-mandrill-233.convex.site" }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      if (url.endsWith("/.well-known/jwks.json")) {
        return new Response(
          JSON.stringify({ keys: [{ n: "test-modulus", e: "AQAB" }] }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      return new Response("Deployment is running", { status: 200 });
    });

    const result = await runConvexRecovery({
      rootDir: "/Users/user/Pictures/shothik.2/shothik-web",
      skipEnvSync: true,
      execFileImpl: execFileImpl as never,
      fetchImpl: fetchImpl as never,
    });

    expect(result.envSync.updated).toBe(false);
    expect(result.deploy.attempted).toBe(true);
    expect(result.checks.every((check) => check.ok)).toBe(true);
    expect(execFileImpl).toHaveBeenCalledTimes(1);
  });

  it("surfaces actionable guidance when Convex env sync lacks permissions", async () => {
    const execFileImpl = vi.fn().mockRejectedValueOnce(
      Object.assign(new Error("env sync failed"), {
        stderr:
          "Error: [CONVEX Q(_system/cli/queryEnvironmentVariables:default)] Server Error\n" +
          "Uncaught Error: You do not have permission to perform this operation (deployment:env:view).\n",
      }),
    );

    await expect(
      runConvexRecovery({
        rootDir: "/Users/user/Pictures/shothik.2/shothik-web",
        execFileImpl: execFileImpl as never,
      }),
    ).rejects.toThrow(
      /pnpm recover:convex --skip-env-sync|deployment environment variables|deployment env permissions/i,
    );

    expect(execFileImpl).toHaveBeenCalledTimes(1);
  });
});
