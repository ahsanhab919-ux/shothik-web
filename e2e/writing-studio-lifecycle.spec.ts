import { writeFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import {
  loginAsSmokeUser,
  requireSmokeCredentials,
} from "./support/smoke-auth";
import { resolveOptionalStorageStatePath } from "./support/e2e-env";

type ProjectRecord = {
  _id: string;
  title: string;
  content: string;
};

type VersionRecord = {
  id: string;
  content: string;
  label: string;
  savedAt: number;
};

type WorkflowMetric = {
  workflow: 'create' | 'save' | 'reopen' | 'restore' | 'delete';
  functionalAvailability: boolean;
  latencyMs: number;
  dataConsistency: boolean;
  details: string;
};

type ProjectState = {
  project: ProjectRecord | null;
  versions: VersionRecord[];
};

const PROJECT_STORAGE_KEY = 'shothik_writing_projects';
const VERSION_STORAGE_KEY = 'shothik_project_versions';
const storageStatePath = resolveOptionalStorageStatePath();

test.use({
  storageState: storageStatePath,
});

test.describe('writing-studio lifecycle cross-browser consistency', () => {
  test('create, save, reopen, restore, and delete remain consistent', async ({ page, browserName }, testInfo) => {
    test.skip(
      !requireSmokeCredentials(),
      "PLAYWRIGHT_SMOKE_EMAIL and PLAYWRIGHT_SMOKE_PASSWORD are required.",
    );

    const runId = `${browserName}-${Date.now()}`;
    const tokenSuffix = Date.now().toString().slice(-6);
    const projectTitle = `Lifecycle ${browserName} ${runId}`;
    const baselineToken = `ALPHA${tokenSuffix}`;
    const restoreToken = `BETA${tokenSuffix}`;
    const versionOneText = ` ${baselineToken} `;
    const versionTwoText = ` ${restoreToken} `;
    const metrics: WorkflowMetric[] = [];

    const createLatencyMs = await measure(async () => {
      await loginAsSmokeUser(page, "/writing-studio?projects=1");
      await openWritingStudio(page, "/writing-studio?projects=1");
      await page.evaluate(
        ({ projectStorageKey, versionStorageKey }) => {
          window.localStorage.removeItem(projectStorageKey);
          window.localStorage.removeItem(versionStorageKey);
          window.localStorage.removeItem('preview-panel-open');
        },
        {
          projectStorageKey: PROJECT_STORAGE_KEY,
          versionStorageKey: VERSION_STORAGE_KEY,
        },
      );
      await openWritingStudio(page, "/writing-studio?projects=1");
      const createProjectButton = page.getByLabel('Create new project').first();
      await expect(createProjectButton).toBeVisible();

      await createProjectButton.click();
      const dialog = page.getByRole('dialog', { name: /create new project/i });
      await expect(dialog).toBeVisible();

      await dialog.getByRole('button', { name: /book writing & publishing/i }).click();
      await dialog.getByRole('button', { name: /^continue$/i }).click();
      await dialog.getByRole('button', { name: /blank book/i }).click();
      await dialog.getByRole('button', { name: /^continue$/i }).click();
      await dialog.getByLabel(/project title/i).fill(projectTitle);

      await Promise.all([
        page.waitForSelector('[aria-label="Document editor"]'),
        dialog.getByRole('button', { name: /create project/i }).click(),
      ]);

      await expect(page.getByRole('button', { name: /save/i })).toBeVisible();
      await expect(getEditor(page)).toBeVisible();
    });

    const createdState = await getProjectState(page, projectTitle);
    expect(createdState.project?._id).toBeTruthy();
    const projectId = createdState.project!._id;

    metrics.push({
      workflow: 'create',
      functionalAvailability: true,
      latencyMs: createLatencyMs,
      dataConsistency: Boolean(createdState.project && createdState.project.title === projectTitle),
      details: `Created local project ${projectId}.`,
    });

    await appendEditorText(page, versionOneText, baselineToken);
    const saveLatencyMs = await measure(async () => {
      await page.getByRole('button', { name: /^save$/i }).click();
      await waitForProjectState(
        page,
        projectTitle,
        ({ project, versions }) =>
          Boolean(
            project?.content.includes(baselineToken) &&
              versions.length >= 1 &&
              versions.some((version) => version.content.includes(baselineToken)),
          ),
      );
    });

    await appendEditorText(page, versionTwoText, restoreToken);
    await page.getByRole('button', { name: /^save$/i }).click();
    await waitForProjectState(
      page,
      projectTitle,
      ({ project, versions }) =>
        Boolean(
          project?.content.includes(baselineToken) &&
            project.content.includes(restoreToken) &&
            versions.length >= 1 &&
            versions.some((version) => version.content.includes(restoreToken)),
        ),
    );

    const savedState = await getProjectState(page, projectTitle);
    metrics.push({
      workflow: 'save',
      functionalAvailability: true,
      latencyMs: saveLatencyMs,
      dataConsistency: Boolean(
        savedState.project?.content.includes(baselineToken) &&
          savedState.project?.content.includes(restoreToken) &&
          savedState.versions.some((version) => version.content.includes(restoreToken)),
      ),
      details: `Saved two manual versions for ${projectId}.`,
    });

    const reopenLatencyMs = await measure(async () => {
      await openWritingStudio(page, `/writing-studio?projectId=${projectId}`);
      await expect(getEditor(page)).toBeVisible();
      await expect(page.getByRole('button', { name: /^save$/i })).toBeVisible();
      await expect
        .poll(async () => ((await getEditor(page).textContent()) ?? '').trim())
        .toContain(restoreToken);
    });

    metrics.push({
      workflow: 'reopen',
      functionalAvailability: true,
      latencyMs: reopenLatencyMs,
      dataConsistency: Boolean((await getEditor(page).textContent())?.includes(restoreToken)),
      details: `Reopened project ${projectId} through the route-level projectId flow.`,
    });

    await openAdvancedMode(page);
    await expect(page.getByText(/rollback & versions/i)).toBeVisible();
    const restoreButtons = page.getByRole('button', { name: /restore this version/i });
    await expect(restoreButtons).toHaveCount(2);

    const restoreLatencyMs = await measure(async () => {
      await restoreButtons.nth(1).click();
      await waitForProjectState(
        page,
        projectTitle,
        ({ project }) =>
          Boolean(
            project?.content.includes(baselineToken) &&
              !project.content.includes(restoreToken),
          ),
      );
      await expect
        .poll(async () => ((await getEditor(page).textContent()) ?? '').trim())
        .not.toContain(restoreToken);
    });

    const restoredState = await getProjectState(page, projectTitle);
    metrics.push({
      workflow: 'restore',
      functionalAvailability: true,
      latencyMs: restoreLatencyMs,
      dataConsistency: Boolean(
        restoredState.project?.content.includes(baselineToken) &&
          !restoredState.project?.content.includes(restoreToken) &&
          restoredState.versions.length >= 3,
      ),
      details: `Restored the older manual version and recorded a restore snapshot for ${projectId}.`,
    });

    const deleteLatencyMs = await measure(async () => {
      await openWritingStudio(page, "/writing-studio?projects=1");
      const projectCard = page.locator(`[data-testid="project-card-${projectId}"]`);
      await expect(projectCard).toBeVisible();
      await projectCard.getByRole('button', { name: /project options/i }).click();
      await page.getByRole('button', { name: /delete project/i }).click();
      await expect(projectCard).toHaveCount(0);
      await waitForProjectDeletion(page, projectId);
    });

    const deletedState = await getProjectState(page, projectTitle);
    metrics.push({
      workflow: 'delete',
      functionalAvailability: true,
      latencyMs: deleteLatencyMs,
      dataConsistency: deletedState.project === null && deletedState.versions.length === 0,
      details: `Deleted project ${projectId} and removed its local version history.`,
    });

    const metricsJson = JSON.stringify(
      {
        browser: browserName,
        projectId,
        projectTitle,
        metrics,
      },
      null,
      2,
    );

    const outputPath = testInfo.outputPath('writing-studio-lifecycle-metrics.json');
    await writeFile(outputPath, metricsJson, 'utf8');
    await testInfo.attach('writing-studio-lifecycle-metrics', {
      body: metricsJson,
      contentType: 'application/json',
    });
  });
});

async function appendEditorText(page: Page, text: string, token: string) {
  const editor = getEditor(page);
  await editor.click();
  await page.keyboard.insertText(text);
  await expect
    .poll(async () => ((await editor.textContent()) ?? '').trim())
    .toContain(token);
  await page.waitForTimeout(300);
}

async function openWritingStudio(page: Page, href: string) {
  await page.goto(href, { waitUntil: "domcontentloaded" });

  if (page.url().includes("/auth/post-login")) {
    const continueButton = page.getByRole("button", { name: /continue now/i });
    await continueButton.waitFor({ state: "visible", timeout: 5_000 });
    await continueButton.click();
  }

  await expect(page).toHaveURL(/\/writing-studio/, { timeout: 15_000 });
  await expect(page).not.toHaveURL(/\/auth\/(login|post-login)/);
}

function getEditor(page: Page) {
  return page.locator('[aria-label="Document editor"]:visible').first();
}

async function openAdvancedMode(page: Page) {
  const toggle = page.getByRole('button', { name: /^simple$/i }).first();
  await toggle.click();
  await page.getByRole('button', { name: /advanced/i }).click();
}

async function getProjectState(page: Page, projectTitle: string): Promise<ProjectState> {
  return page.evaluate(
    ({ projectStorageKey, versionStorageKey, title }) => {
      const projects = JSON.parse(window.localStorage.getItem(projectStorageKey) || '[]');
      const versionsByProject = JSON.parse(window.localStorage.getItem(versionStorageKey) || '{}');
      const project = projects.find((entry: ProjectRecord) => entry.title === title) ?? null;
      return {
        project,
        versions: project ? versionsByProject[project._id] ?? [] : [],
      };
    },
    {
      projectStorageKey: PROJECT_STORAGE_KEY,
      versionStorageKey: VERSION_STORAGE_KEY,
      title: projectTitle,
    },
  );
}

async function waitForProjectState(
  page: Page,
  projectTitle: string,
  predicate: (state: ProjectState) => boolean,
) {
  await expect
    .poll(async () => predicate(await getProjectState(page, projectTitle)), {
      timeout: 15000,
      intervals: [250, 500, 1000],
    })
    .toBeTruthy();
}

async function waitForProjectDeletion(page: Page, projectId: string) {
  await expect
    .poll(async () =>
      page.evaluate(
        ({ projectStorageKey, versionStorageKey, id }) => {
          const projects = JSON.parse(window.localStorage.getItem(projectStorageKey) || '[]');
          const versionsByProject = JSON.parse(window.localStorage.getItem(versionStorageKey) || '{}');
          const projectExists = projects.some((entry: ProjectRecord) => entry._id === id);
          const versionCount = Array.isArray(versionsByProject[id]) ? versionsByProject[id].length : 0;
          return !projectExists && versionCount === 0;
        },
        {
          projectStorageKey: PROJECT_STORAGE_KEY,
          versionStorageKey: VERSION_STORAGE_KEY,
          id: projectId,
        },
      ),
    )
    .toBeTruthy();
}

async function measure(action: () => Promise<void>) {
  const startedAt = Date.now();
  await action();
  return Date.now() - startedAt;
}
