import { describe, expect, it, vi } from 'vitest';

import type {
  MCPAuditEvent,
  MCPConnectorRecord,
  MCPGatewayDiscoveryRequest,
  MCPGatewayInvokeRequest,
  MCPToolDescriptor,
} from '../mcp/gateway-contract';
import { ServerMCPGateway } from '../mcp/gateway';
import {
  DefaultManagedConnectorAdapterRegistry,
  type ManagedMCPConnectorAdapter,
} from '../mcp/managed-connector-adapter';

const NOW = new Date('2026-07-17T12:00:00.000Z');

const activeConnector: MCPConnectorRecord = {
  id: 'connector-1',
  tenantId: 'tenant-1',
  slug: 'higgsfield',
  displayName: 'Higgsfield MCP',
  source: 'shothik_managed',
  transport: 'streamable_http',
  authMode: 'api_key',
  baseUrl: 'https://mcp.example.com',
  riskTier: 'high',
  status: 'active',
  capabilityStatus: 'ready',
  ownerUserId: null,
  secretRef: 'secret-1',
  metadata: {
    adapterKey: 'managed_remote_http',
  },
  lastDiscoveredAt: null,
  createdAt: NOW.toISOString(),
  updatedAt: NOW.toISOString(),
};

const readTool: MCPToolDescriptor = {
  connectorId: activeConnector.id,
  name: 'list_styles',
  title: 'List Styles',
  description: 'List available creative styles',
  inputSchema: {},
  outputSchema: null,
  mutationMode: 'read',
  riskTier: 'high',
  status: 'enabled',
  metadata: {},
  discoveredAt: NOW.toISOString(),
};

const writeTool: MCPToolDescriptor = {
  ...readTool,
  name: 'generate_video',
  title: 'Generate Video',
  description: 'Generate a creative video asset',
  mutationMode: 'write',
};

describe('ServerMCPGateway', () => {
  it('discovers tools and writes discovery audit events', async () => {
    const auditWriter = createAuditWriter();
    const toolCatalogRepository = createToolCatalogRepository();
    const adapter = createAdapter({
      discoverTools: vi.fn().mockResolvedValue({
        discoveredAt: NOW.toISOString(),
        tools: [readTool],
      }),
    });

    const gateway = createGateway({
      adapter,
      auditWriter,
      toolCatalogRepository,
    });

    const result = await gateway.discoverTools({
      tenantId: activeConnector.tenantId,
      connectorId: activeConnector.id,
      forceRefresh: true,
    } satisfies MCPGatewayDiscoveryRequest);

    expect(result.status).toBe('success');
    expect(result.tools).toEqual([readTool]);
    expect(toolCatalogRepository.upsertTools).toHaveBeenCalledWith(
      activeConnector.id,
      [readTool],
    );
    expect(auditWriter.write).toHaveBeenCalledTimes(2);
    expect(auditWriter.write.mock.calls[0][0]).toMatchObject({
      eventType: 'mcp.connector.discovery.started',
      connectorId: activeConnector.id,
    });
    expect(auditWriter.write.mock.calls[1][0]).toMatchObject({
      eventType: 'mcp.connector.discovery.completed',
      connectorId: activeConnector.id,
      status: 'success',
    });
  });

  it('blocks mutating tool invocations until confirmation is present', async () => {
    const auditWriter = createAuditWriter();
    const toolCatalogRepository = createToolCatalogRepository(writeTool);
    const adapter = createAdapter();

    const gateway = createGateway({
      adapter,
      auditWriter,
      toolCatalogRepository,
    });

    const result = await gateway.invokeTool({
      tenantId: activeConnector.tenantId,
      userId: 'user-1',
      connectorId: activeConnector.id,
      toolName: writeTool.name,
      arguments: {
        prompt: 'Create a cinematic scene',
      },
      origin: 'workflow_orchestrator',
    } satisfies MCPGatewayInvokeRequest);

    expect(result.status).toBe('blocked');
    expect(result.policyDecision.decision).toBe('confirm_required');
    expect(adapter.invokeTool).not.toHaveBeenCalled();
    expect(auditWriter.write).toHaveBeenCalledTimes(2);
    expect(auditWriter.write.mock.calls[1][0]).toMatchObject({
      eventType: 'mcp.tool.invocation.blocked',
      toolName: writeTool.name,
      status: 'blocked',
    });
  });

  it('invokes the adapter after policy confirmation is provided', async () => {
    const auditWriter = createAuditWriter();
    const toolCatalogRepository = createToolCatalogRepository(writeTool);
    const adapter = createAdapter({
      invokeTool: vi.fn().mockResolvedValue({
        output: { jobId: 'job-1', status: 'queued' },
        outputText: 'Queued generation request',
        retries: 0,
        estimatedCostUsd: 0.12,
      }),
    });

    const gateway = createGateway({
      adapter,
      auditWriter,
      toolCatalogRepository,
    });

    const result = await gateway.invokeTool({
      tenantId: activeConnector.tenantId,
      userId: 'user-1',
      connectorId: activeConnector.id,
      toolName: writeTool.name,
      arguments: {
        prompt: 'Create a cinematic scene',
      },
      origin: 'workflow_orchestrator',
      confirmationToken: 'confirmed',
    } satisfies MCPGatewayInvokeRequest);

    expect(result.status).toBe('success');
    expect(result.outputText).toBe('Queued generation request');
    expect(adapter.invokeTool).toHaveBeenCalledWith(
      expect.objectContaining({
        connector: activeConnector,
        tool: writeTool,
      }),
    );
    expect(auditWriter.write).toHaveBeenCalledTimes(2);
    expect(auditWriter.write.mock.calls[1][0]).toMatchObject({
      eventType: 'mcp.tool.invocation.completed',
      toolName: writeTool.name,
      status: 'success',
    });
  });
});

function createGateway(options?: {
  adapter?: ReturnType<typeof createAdapter>;
  auditWriter?: ReturnType<typeof createAuditWriter>;
  toolCatalogRepository?: ReturnType<typeof createToolCatalogRepository>;
}) {
  const adapter = options?.adapter ?? createAdapter();

  return new ServerMCPGateway({
    adapterRegistry: new DefaultManagedConnectorAdapterRegistry([adapter]),
    connectorRegistry: {
      getConnector: vi.fn().mockResolvedValue(activeConnector),
    },
    toolCatalogRepository:
      options?.toolCatalogRepository ?? createToolCatalogRepository(readTool),
    auditWriter: options?.auditWriter ?? createAuditWriter(),
    idGenerator: createIdGenerator(),
    now: () => NOW,
  });
}

function createAdapter(overrides?: {
  discoverTools?: ReturnType<typeof vi.fn>;
  invokeTool?: ReturnType<typeof vi.fn>;
}): ManagedMCPConnectorAdapter {
  const discoverTools =
    (overrides?.discoverTools ??
      vi.fn().mockResolvedValue({
        discoveredAt: NOW.toISOString(),
        tools: [readTool],
      })) as ManagedMCPConnectorAdapter['discoverTools'];
  const invokeTool =
    (overrides?.invokeTool ??
      vi.fn().mockResolvedValue({
        output: { ok: true },
        retries: 0,
      })) as ManagedMCPConnectorAdapter['invokeTool'];

  return {
    adapterKey: 'managed_remote_http',
    discoverTools,
    invokeTool,
  };
}

function createAuditWriter() {
  return {
    write: vi.fn<(_: MCPAuditEvent) => Promise<void>>().mockResolvedValue(
      undefined,
    ),
  };
}

function createToolCatalogRepository(tool: MCPToolDescriptor | null = null) {
  return {
    getTool: vi.fn().mockResolvedValue(tool),
    upsertTools: vi.fn().mockResolvedValue(undefined),
  };
}

function createIdGenerator() {
  let index = 0;
  return () => `id-${++index}`;
}
