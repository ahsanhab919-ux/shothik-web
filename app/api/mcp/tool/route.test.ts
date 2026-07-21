import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { mockAuthenticateMcpRequest, mockInvokeTool } = vi.hoisted(() => ({
  mockAuthenticateMcpRequest: vi.fn(),
  mockInvokeTool: vi.fn(),
}));

vi.mock('@/lib/mcp/request-auth', () => ({
  authenticateMcpRequest: mockAuthenticateMcpRequest,
}));

vi.mock('@/lib/mcp/runtime', () => ({
  createCreativeStudioGateway: () => ({
    invokeTool: mockInvokeTool,
  }),
}));

import { POST } from './route';

describe('POST /api/mcp/tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when the user is not authenticated', async () => {
    mockAuthenticateMcpRequest.mockResolvedValue({
      authenticated: false,
      authType: 'none',
      error: 'Authentication required',
    });

    const request = new NextRequest('http://localhost:3000/api/mcp/tool', {
      method: 'POST',
      body: JSON.stringify({ name: 'shothik.grammar.check_text', parameters: { text: 'Hello' } }),
    });

    const response = await POST(request);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: 'AUTHENTICATION_REQUIRED',
    });
  });

  it('returns 400 when the body is not valid JSON', async () => {
    mockAuthenticateMcpRequest.mockResolvedValue({
      authenticated: true,
      tenantId: 'tenant-1',
      userId: 'tenant-1',
      origin: 'mcp_host',
      authType: 'user_session',
    });

    const request = new NextRequest('http://localhost:3000/api/mcp/tool', {
      method: 'POST',
      body: '{',
      headers: {
        'content-type': 'application/json',
      },
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: 'INVALID_REQUEST',
    });
  });

  it('returns 404 when the tool is not native/known', async () => {
    mockAuthenticateMcpRequest.mockResolvedValue({
      authenticated: true,
      tenantId: 'tenant-1',
      userId: 'tenant-1',
      origin: 'mcp_host',
      authType: 'user_session',
    });

    const request = new NextRequest('http://localhost:3000/api/mcp/tool', {
      method: 'POST',
      body: JSON.stringify({ name: 'unknown.tool', parameters: {} }),
    });

    const response = await POST(request);

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      error: 'TOOL_NOT_FOUND',
    });
    expect(mockInvokeTool).not.toHaveBeenCalled();
  });

  it('returns 404 when the tool is internal-only and not exposed to MCP hosts', async () => {
    mockAuthenticateMcpRequest.mockResolvedValue({
      authenticated: true,
      tenantId: 'tenant-1',
      userId: 'tenant-1',
      origin: 'mcp_host',
      authType: 'user_session',
    });

    const request = new NextRequest('http://localhost:3000/api/mcp/tool', {
      method: 'POST',
      body: JSON.stringify({ name: 'shothik.twin.execute_task', parameters: { taskId: 'task-1' } }),
    });

    const response = await POST(request);

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      error: 'TOOL_NOT_FOUND',
    });
    expect(mockInvokeTool).not.toHaveBeenCalled();
  });

  it('returns 200 and tool output when the invocation succeeds', async () => {
    mockAuthenticateMcpRequest.mockResolvedValue({
      authenticated: true,
      tenantId: 'tenant-1',
      userId: 'tenant-1',
      origin: 'mcp_host',
      authType: 'user_session',
    });
    mockInvokeTool.mockResolvedValue({
      invocationId: 'invocation-1',
      connectorId: 'shothik-native:tenant-1',
      toolName: 'shothik.grammar.check_text',
      status: 'success',
      output: { success: true, correctedText: 'Hello' },
      outputText: null,
      policyDecision: { decision: 'allow', reasonCode: null, matchedPolicyIds: [], effectiveRiskTier: 'moderate' },
      metrics: { durationMs: 1, retries: 0 },
    });

    const request = new NextRequest('http://localhost:3000/api/mcp/tool', {
      method: 'POST',
      body: JSON.stringify({
        name: 'shothik.grammar.check_text',
        parameters: { text: 'Hello' },
        traceId: 'trace-1',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toMatchObject({
      success: true,
      toolName: 'shothik.grammar.check_text',
      invocationId: 'invocation-1',
      output: { success: true, correctedText: 'Hello' },
    });
  });

  it('returns 403 when the invocation is denied by policy', async () => {
    mockAuthenticateMcpRequest.mockResolvedValue({
      authenticated: true,
      tenantId: 'tenant-1',
      userId: 'tenant-1',
      origin: 'mcp_host',
      authType: 'user_session',
    });
    mockInvokeTool.mockResolvedValue({
      invocationId: 'invocation-2',
      connectorId: 'shothik-native:tenant-1',
      toolName: 'shothik.grammar.check_text',
      status: 'blocked',
      output: null,
      policyDecision: { decision: 'deny', reasonCode: 'tool_disabled', matchedPolicyIds: [], effectiveRiskTier: 'moderate' },
      metrics: { durationMs: 0, retries: 0 },
    });

    const request = new NextRequest('http://localhost:3000/api/mcp/tool', {
      method: 'POST',
      body: JSON.stringify({
        name: 'shothik.grammar.check_text',
        parameters: { text: 'Hello' },
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: 'tool_disabled',
    });
  });

  it('allows authenticated twin-key requests to invoke governed native tools', async () => {
    mockAuthenticateMcpRequest.mockResolvedValue({
      authenticated: true,
      tenantId: 'tenant-1',
      userId: 'tenant-1',
      origin: 'mcp_host',
      authType: 'twin_key',
      twinId: 'twin-1',
    });
    mockInvokeTool.mockResolvedValue({
      invocationId: 'invocation-3',
      connectorId: 'shothik-native:tenant-1',
      toolName: 'shothik.grammar.check_text',
      status: 'success',
      output: { success: true },
      outputText: null,
      policyDecision: { decision: 'allow', reasonCode: null, matchedPolicyIds: [], effectiveRiskTier: 'moderate' },
      metrics: { durationMs: 1, retries: 0 },
    });

    const request = new NextRequest('http://localhost:3000/api/mcp/tool', {
      method: 'POST',
      body: JSON.stringify({
        name: 'shothik.grammar.check_text',
        parameters: { text: 'Hello from twin' },
      }),
      headers: {
        authorization: 'Bearer shothik_agent_test',
      },
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockInvokeTool).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        userId: 'tenant-1',
        origin: 'mcp_host',
      }),
    );
  });
});
