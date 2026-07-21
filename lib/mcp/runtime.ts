import { logger } from '@/lib/logger';

import type {
  MCPAuditEvent,
  MCPConnectorRecord,
  MCPToolDescriptor,
} from './gateway-contract';
import { ServerMCPGateway, type MCPAuditWriter, type MCPConnectorRegistry, type MCPToolCatalogRepository } from './gateway';
import {
  createHiggsfieldManagedConnector,
  resolveHiggsfieldConnectorId,
} from './connectors/higgsfield';
import {
  createShothikNativeConnector,
  resolveShothikNativeConnectorId,
  SHOTHIK_NATIVE_ADAPTER_KEY,
} from './connectors/shothik-native';
import {
  DefaultManagedConnectorAdapterRegistry,
  type MCPConnectorSecretResolver,
  ManagedRemoteHTTPMCPConnectorAdapter,
} from './managed-connector-adapter';
import { ShothikNativeConnectorAdapter } from './shothik-native-adapter';

export interface HiggsfieldRuntimeConfig {
  baseUrl: string;
  apiKey: string;
}

export function getHiggsfieldRuntimeConfig(
  env: NodeJS.ProcessEnv = process.env,
): HiggsfieldRuntimeConfig | null {
  const baseUrl = env.HIGGSFIELD_MCP_URL?.trim();
  const apiKey =
    env.HIGGSFIELD_MCP_API_KEY?.trim() ?? env.HIGGSFIELD_API_KEY?.trim() ?? '';

  if (!baseUrl || !apiKey) {
    return null;
  }

  return {
    baseUrl: baseUrl.replace(/\/$/, ''),
    apiKey,
  };
}

class InMemoryMCPToolCatalogRepository implements MCPToolCatalogRepository {
  private readonly catalog = new Map<string, Map<string, MCPToolDescriptor>>();

  async getTool(
    connectorId: string,
    toolName: string,
  ): Promise<MCPToolDescriptor | null> {
    return this.catalog.get(connectorId)?.get(toolName) ?? null;
  }

  async upsertTools(
    connectorId: string,
    tools: MCPToolDescriptor[],
  ): Promise<void> {
    const byName =
      this.catalog.get(connectorId) ?? new Map<string, MCPToolDescriptor>();

    for (const tool of tools) {
      byName.set(tool.name, tool);
    }

    this.catalog.set(connectorId, byName);
  }
}

class EnvHiggsfieldConnectorRegistry implements MCPConnectorRegistry {
  async getConnector(
    tenantId: string,
    connectorId: string,
  ): Promise<MCPConnectorRecord | null> {
    const config = getHiggsfieldRuntimeConfig();
    if (!config) {
      return null;
    }

    const expectedId = resolveHiggsfieldConnectorId(tenantId);
    if (connectorId !== expectedId) {
      return null;
    }

    return createHiggsfieldManagedConnector({
      id: expectedId,
      tenantId,
      baseUrl: config.baseUrl,
      secretRef: 'env:higgsfield',
      status: 'active',
    });
  }
}

class RuntimeConnectorRegistry implements MCPConnectorRegistry {
  private readonly higgsfieldRegistry = new EnvHiggsfieldConnectorRegistry();

  async getConnector(
    tenantId: string,
    connectorId: string,
  ): Promise<MCPConnectorRecord | null> {
    const nativeId = resolveShothikNativeConnectorId(tenantId);
    if (connectorId === nativeId) {
      return createShothikNativeConnector({
        tenantId,
        id: nativeId,
        ownerUserId: null,
        status: 'active',
      });
    }

    return this.higgsfieldRegistry.getConnector(tenantId, connectorId);
  }
}

class EnvHiggsfieldSecretResolver implements MCPConnectorSecretResolver {
  async resolve(): Promise<{ apiKey: string } | null> {
    const config = getHiggsfieldRuntimeConfig();
    if (!config) {
      return null;
    }

    return {
      apiKey: config.apiKey,
    };
  }
}

class LoggerMCPAuditWriter implements MCPAuditWriter {
  async write(event: MCPAuditEvent): Promise<void> {
    logger.info('[mcp-audit] event', {
      eventType: event.eventType,
      tenantId: event.tenantId,
      connectorId: event.connectorId,
      toolName: event.toolName,
      status: event.status,
      traceId: event.traceId,
      policyReasonCode: event.policyReasonCode,
    });
  }
}

const runtimeToolCatalogRepository = new InMemoryMCPToolCatalogRepository();
const runtimeAdapterRegistry = new DefaultManagedConnectorAdapterRegistry([
  new ShothikNativeConnectorAdapter(SHOTHIK_NATIVE_ADAPTER_KEY),
  new ManagedRemoteHTTPMCPConnectorAdapter(new EnvHiggsfieldSecretResolver()),
]);
const runtimeConnectorRegistry = new RuntimeConnectorRegistry();
const runtimeAuditWriter = new LoggerMCPAuditWriter();

export function createCreativeStudioGateway(): ServerMCPGateway {
  return new ServerMCPGateway({
    adapterRegistry: runtimeAdapterRegistry,
    connectorRegistry: runtimeConnectorRegistry,
    toolCatalogRepository: runtimeToolCatalogRepository,
    auditWriter: runtimeAuditWriter,
  });
}
