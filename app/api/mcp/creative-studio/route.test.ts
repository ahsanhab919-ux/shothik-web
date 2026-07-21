import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { mockGetAuthenticatedUser, mockRunCreativeStudioWorkflow } = vi.hoisted(
  () => ({
    mockGetAuthenticatedUser: vi.fn(),
    mockRunCreativeStudioWorkflow: vi.fn(),
  }),
);

vi.mock('@/lib/server-auth', () => ({
  getAuthenticatedUser: mockGetAuthenticatedUser,
}));

vi.mock('@/lib/mcp/creative-studio', () => ({
  runCreativeStudioWorkflow: mockRunCreativeStudioWorkflow,
}));

import { POST } from './route';

describe('POST /api/mcp/creative-studio', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when the user is not authenticated', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);

    const request = new NextRequest(
      'http://localhost:3000/api/mcp/creative-studio',
      {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'Create an image',
          assetType: 'image',
        }),
      },
    );

    const response = await POST(request);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: 'AUTHENTICATION_REQUIRED',
    });
  });

  it('returns 400 when the body is not valid JSON', async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ _id: 'user-1' });

    const request = new NextRequest(
      'http://localhost:3000/api/mcp/creative-studio',
      {
        method: 'POST',
        body: '{',
        headers: {
          'content-type': 'application/json',
        },
      },
    );

    const response = await POST(request);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: 'INVALID_REQUEST',
      message: 'Request body must be valid JSON.',
    });
  });

  it('returns 400 when the request payload is invalid', async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ _id: 'user-1' });

    const request = new NextRequest(
      'http://localhost:3000/api/mcp/creative-studio',
      {
        method: 'POST',
        body: JSON.stringify({
          prompt: '',
          assetType: 'image',
        }),
      },
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toMatchObject({
      error: 'INVALID_REQUEST',
      message: 'Creative Studio request is invalid.',
    });
    expect(data.issues).toBeTruthy();
  });

  it('returns 409 when the workflow requires confirmation', async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ _id: 'user-1' });
    mockRunCreativeStudioWorkflow.mockResolvedValue({
      status: 'blocked',
      connectorId: 'higgsfield:user-1',
      toolName: 'generate_image',
      confirmationRequired: true,
      policyReasonCode: 'confirmation_required',
      output: null,
    });

    const request = new NextRequest(
      'http://localhost:3000/api/mcp/creative-studio',
      {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'Create an image',
          assetType: 'image',
        }),
      },
    );

    const response = await POST(request);

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: 'MCP_CONFIRMATION_REQUIRED',
      toolName: 'generate_image',
    });
  });

  it('returns 403 when the workflow is blocked for a non-confirmation policy reason', async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ _id: 'user-1' });
    mockRunCreativeStudioWorkflow.mockResolvedValue({
      status: 'blocked',
      connectorId: 'higgsfield:user-1',
      toolName: 'generate_image',
      confirmationRequired: false,
      policyReasonCode: 'tool_disabled',
      output: null,
    });

    const request = new NextRequest(
      'http://localhost:3000/api/mcp/creative-studio',
      {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'Create an image',
          assetType: 'image',
        }),
      },
    );

    const response = await POST(request);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: 'tool_disabled',
      policyReasonCode: 'tool_disabled',
    });
  });

  it('maps connector availability failures to a 503 response', async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ _id: 'user-1' });
    mockRunCreativeStudioWorkflow.mockResolvedValue({
      status: 'failed',
      connectorId: 'higgsfield:user-1',
      toolName: 'generate_image',
      confirmationRequired: false,
      output: null,
      error: {
        code: 'connector_not_configured',
        message: 'Higgsfield MCP is not configured.',
        retryable: false,
      },
    });

    const request = new NextRequest(
      'http://localhost:3000/api/mcp/creative-studio',
      {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'Create an image',
          assetType: 'image',
        }),
      },
    );

    const response = await POST(request);

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: 'connector_not_configured',
      retryable: false,
    });
  });

  it('returns a dry-run planning result when the request is marked dryRun', async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ _id: 'user-1' });
    mockRunCreativeStudioWorkflow.mockResolvedValue({
      status: 'success',
      connectorId: 'higgsfield:user-1',
      toolName: 'generate_image',
      confirmationRequired: false,
      output: {
        planned: true,
        connectorId: 'higgsfield:user-1',
        toolName: 'generate_image',
      },
    });

    const request = new NextRequest(
      'http://localhost:3000/api/mcp/creative-studio',
      {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'Create an editorial cover concept',
          assetType: 'image',
          dryRun: true,
        }),
      },
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mockRunCreativeStudioWorkflow).toHaveBeenCalledWith({
      tenantId: 'user-1',
      userId: 'user-1',
      prompt: 'Create an editorial cover concept',
      assetType: 'image',
      dryRun: true,
    });
    expect(data).toMatchObject({
      success: true,
      toolName: 'generate_image',
      output: {
        planned: true,
      },
    });
  });

  it('returns the workflow result on success', async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ _id: 'user-1' });
    mockRunCreativeStudioWorkflow.mockResolvedValue({
      status: 'success',
      connectorId: 'higgsfield:user-1',
      toolName: 'generate_video',
      confirmationRequired: false,
      output: { jobId: 'job-1' },
      outputText: 'Queued',
      invocationId: 'invoke-1',
    });

    const request = new NextRequest(
      'http://localhost:3000/api/mcp/creative-studio',
      {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'Create a teaser video',
          assetType: 'video',
          confirmed: true,
        }),
      },
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mockRunCreativeStudioWorkflow).toHaveBeenCalledWith({
      tenantId: 'user-1',
      userId: 'user-1',
      prompt: 'Create a teaser video',
      assetType: 'video',
      confirmed: true,
    });
    expect(data).toMatchObject({
      success: true,
      toolName: 'generate_video',
      outputText: 'Queued',
    });
  });
});
