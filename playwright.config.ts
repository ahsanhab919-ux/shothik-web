import { existsSync } from 'node:fs';
import path from 'node:path';
import dotenv from "dotenv";
import { defineConfig, devices } from '@playwright/test';
import {
  getE2EAccessConfig,
  getVercelProtectionHeaders,
} from './e2e/support/e2e-env';

dotenv.config({ path: path.join(process.cwd(), ".env.local") });
dotenv.config({ path: path.join(process.cwd(), ".env") });

const accessConfig = getE2EAccessConfig();
const authSetupProjectName = 'auth-setup';
const baseURL = accessConfig.baseURL;
const useRemoteBaseUrl = accessConfig.isRemote;
const browserChannel = process.env.PLAYWRIGHT_BROWSER_CHANNEL;
const hasChromeChannel = existsSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
const localEdgeExecutablePath = path.join(process.cwd(), '.browser-apps', 'Microsoft Edge.app', 'Contents', 'MacOS', 'Microsoft Edge');
const systemEdgeExecutablePath = '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge';
const edgeExecutablePath = existsSync(localEdgeExecutablePath)
    ? localEdgeExecutablePath
    : existsSync(systemEdgeExecutablePath)
      ? systemEdgeExecutablePath
      : null;

const browserProjects: any[] = [
    {
        name: hasChromeChannel ? 'chrome-stable' : 'chromium',
        use: {
            ...devices['Desktop Chrome'],
            ...(browserChannel ? { channel: browserChannel } : hasChromeChannel ? { channel: 'chrome' } : {}),
        },
    },
    {
        name: 'firefox-stable',
        use: {
            ...devices['Desktop Firefox'],
        },
    },
    {
        name: 'safari-webkit',
        use: {
            ...devices['Desktop Safari'],
        },
    },
];

if (edgeExecutablePath) {
    browserProjects.push({
        name: 'edge-stable',
        use: {
            ...devices['Desktop Chrome'],
            launchOptions: {
                executablePath: edgeExecutablePath,
            },
        },
    });
}

const projects: any[] = accessConfig.useAuthSetup
    ? [
          {
              name: authSetupProjectName,
              testMatch: /authenticated\.setup\.ts/,
              use: {
                  ...devices['Desktop Chrome'],
                  ...(browserChannel ? { channel: browserChannel } : hasChromeChannel ? { channel: 'chrome' } : {}),
              },
          },
          ...browserProjects.map((project) => ({
              ...project,
              dependencies: [authSetupProjectName],
              testIgnore: ['**/authenticated.setup.ts'],
          })),
      ]
    : browserProjects.map((project) => ({
          ...project,
          testIgnore: ['**/authenticated.setup.ts'],
      }));

export default defineConfig({
    testDir: './e2e',
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: 1,
    reporter: 'html',
    use: {
        baseURL,
        trace: 'on-first-retry',
        extraHTTPHeaders: getVercelProtectionHeaders(),
    },
    projects,
    webServer: useRemoteBaseUrl
        ? undefined
        : {
              command:
                  'NEXT_PUBLIC_CONVEX_URL=https://dashing-mandrill-233.convex.cloud STRIPE_SECRET_KEY=sk_test_placeholder NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_placeholder CLERK_SECRET_KEY=sk_test_placeholder pnpm dev',
              url: 'http://localhost:3000',
              reuseExistingServer: !process.env.CI,
          },
});
