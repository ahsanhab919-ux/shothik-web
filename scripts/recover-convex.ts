import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { runConvexRecovery } from "@/lib/convex-recovery";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

dotenv.config({ path: path.join(rootDir, ".env.local") });
dotenv.config({ path: path.join(rootDir, ".env"), override: false });

function hasFlag(flag: string) {
  return process.argv.includes(flag);
}

async function main() {
  const result = await runConvexRecovery({
    rootDir,
    dryRun: hasFlag("--dry-run"),
    forceEnvSync: hasFlag("--force-env-sync"),
    skipEnvSync: hasFlag("--skip-env-sync"),
    skipDeploy: hasFlag("--skip-deploy"),
  });

  const report = {
    deployment: result.config.deployment,
    cloudUrl: result.config.cloudUrl,
    siteUrl: result.config.siteUrl,
    envSync: result.envSync,
    deploy: {
      attempted: result.deploy.attempted,
      command: result.deploy.command,
      stdout: result.deploy.stdout,
      stderr: result.deploy.stderr,
    },
    checks: result.checks,
    recovered: result.checks.every((check) => check.ok),
  };

  console.log(JSON.stringify(report, null, 2));

  if (!report.recovered) {
    process.exitCode = 1;
  }
}

void main();
