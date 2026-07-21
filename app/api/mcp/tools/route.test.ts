import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { mockAuthenticateMcpRequest, mockDiscoverTools } = vi.hoisted(() => ({
  mockAuthenticateMcpRequest: vi.fn(),
  mockDiscoverTools: vi.fn(),
}));

vi.mock('@/lib/mcp/request-auth', () => ({
  authenticateMcpRequest: mockAuthenticateMcpRequest,
}));

vi.mock('@/lib/mcp/runtime', () => ({
  createCreativeStudioGateway: () => ({
    discoverTools: mockDiscoverTools,
  }),
}));

import { GET } from './route';

describe('GET /api/mcp/tools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when the user is not authenticated', async () => {
    mockAuthenticateMcpRequest.mockResolvedValue({
      authenticated: false,
      authType: 'none',
      error: 'Authentication required',
    });

    const response = await GET(new NextRequest('http://localhost:3000/api/mcp/tools'));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: 'AUTHENTICATION_REQUIRED',
    });
  });

  it('returns the discovered tool catalog for the authenticated tenant', async () => {
    mockAuthenticateMcpRequest.mockResolvedValue({
      authenticated: true,
      tenantId: 'tenant-1',
      userId: 'tenant-1',
      origin: 'mcp_host',
      authType: 'user_session',
    });
    mockDiscoverTools.mockResolvedValue({
      status: 'success',
      connectorId: 'shothik-native:tenant-1',
      discoveredAt: new Date().toISOString(),
      tools: [
        {
          name: 'shothik.grammar.check_text',
          title: 'Grammar Checker',
          description: 'Check grammar',
          inputSchema: { type: 'object' },
          outputSchema: null,
          metadata: {},
        },
        {
          name: 'shothik.twin.execute_task',
          title: 'Execute Twin Task',
          description: 'Internal task executor',
          inputSchema: { type: 'object' },
          outputSchema: null,
          metadata: { hostExposure: 'internal' },
        },
      ],
    });

    const response = await GET(new NextRequest('http://localhost:3000/api/mcp/tools'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(1);
    expect(data[0]).toMatchObject({
      name: expect.any(String),
      description: expect.any(String),
      parameters: expect.any(Object),
    });
  });

  it('returns 503 when governed discovery fails', async () => {
    mockAuthenticateMcpRequest.mockResolvedValue({
      authenticated: true,
      tenantId: 'tenant-1',
      userId: 'tenant-1',
      origin: 'mcp_host',
      authType: 'user_session',
    });
    mockDiscoverTools.mockResolvedValue({
      status: 'failed',
      connectorId: 'shothik-native:tenant-1',
      discoveredAt: new Date().toISOString(),
      tools: [],
      error: {
        code: 'connector_unavailable',
        message: 'Discovery unavailable',
      },
    });

    const response = await GET(new NextRequest('http://localhost:3000/api/mcp/tools'));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      error: 'connector_unavailable',
    });
  });
});
