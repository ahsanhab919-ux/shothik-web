import { buildMcpHeaders, fetchWithTimeout } from '@/lib/mcp/config';

import type {
  MCPConnectorRecord,
  MCPConnectorRiskTier,
  MCPGatewayError,
  MCPToolDescriptor,
  MCPToolMutationMode,
} from './gateway-contract';

export interface MCPResolvedConnectorSecret {
  apiKey?: string;
  accessToken?: string;
  headers?: Record<string, string>;
  metadata?: Record<string, unknown>;
}

export interface MCPConnectorSecretResolver {
  resolve(connector: MCPConnectorRecord): Promise<MCPResolvedConnectorSecret | null>;
}

export interface ManagedConnectorDiscoveryInput {
  connector: MCPConnectorRecord;
  forceRefresh?: boolean;
  traceId?: string;
}

export interface ManagedConnectorDiscoveryOutput {
  tools: MCPToolDescriptor[];
  discoveredAt: string;
}

export interface ManagedConnectorInvocationInput {
  connector: MCPConnectorRecord;
  tool: MCPToolDescriptor;
  arguments: Record<string, unknown>;
  traceId?: string;
  timeoutMs?: number;
}

export interface ManagedConnectorInvocationOutput {
  output: unknown;
  outputText?: string;
  retries: number;
  estimatedCostUsd?: number;
}

export interface ManagedMCPConnectorAdapter {
  adapterKey: string;
  discoverTools(
    input: ManagedConnectorDiscoveryInput,
  ): Promise<ManagedConnectorDiscoveryOutput>;
  invokeTool(
    input: ManagedConnectorInvocationInput,
  ): Promise<ManagedConnectorInvocationOutput>;
}

export interface ManagedConnectorAdapterRegistry {
  getAdapter(connector: MCPConnectorRecord): ManagedMCPConnectorAdapter | null;
}

export class DefaultManagedConnectorAdapterRegistry
  implements ManagedConnectorAdapterRegistry
{
  private readonly adapters = new Map<string, ManagedMCPConnectorAdapter>();

  constructor(adapters: ManagedMCPConnectorAdapter[] = []) {
    for (const adapter of adapters) {
      this.adapters.set(adapter.adapterKey, adapter);
    }
  }

  getAdapter(connector: MCPConnectorRecord): ManagedMCPConnectorAdapter | null {
    const adapterKey =
      typeof connector.metadata.adapterKey === 'string'
        ? connector.metadata.adapterKey
        : null;

    if (!adapterKey) {
      return null;
    }

    return this.adapters.get(adapterKey) ?? null;
  }
}

export class ManagedConnectorAdapterError extends Error {
  constructor(public readonly gatewayError: MCPGatewayError) {
    super(gatewayError.message);
    this.name = 'ManagedConnectorAdapterError';
  }
}

export class NoopConnectorSecretResolver implements MCPConnectorSecretResolver {
  async resolve(): Promise<MCPResolvedConnectorSecret | null> {
    return null;
  }
}

export class ManagedRemoteHTTPMCPConnectorAdapter
  implements ManagedMCPConnectorAdapter
{
  readonly adapterKey = 'managed_remote_http';

  constructor(
    private readonly secretResolver: MCPConnectorSecretResolver = new NoopConnectorSecretResolver(),
  ) {}

  async discoverTools(
    input: ManagedConnectorDiscoveryInput,
  ): Promise<ManagedConnectorDiscoveryOutput> {
    const headers = await this.buildHeaders(input.connector);
    const response = await fetchWithTimeout(
      `${normalizeConnectorBaseUrl(input.connector.baseUrl)}/mcp/tools`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      },
      10_000,
    );

    if (!response.ok) {
      throw new ManagedConnectorAdapterError({
        code: response.status === 401 ? 'connector_auth_failed' : 'connector_unavailable',
        message: `Failed to discover MCP tools: ${response.status} ${response.statusText}`,
        retryable: response.status >= 500 || response.status === 429,
        details: {
          connectorId: input.connector.id,
          status: response.status,
        },
      });
    }

    const rawTools = (await response.json()) as unknown;
    if (!Array.isArray(rawTools)) {
      throw new ManagedConnectorAdapterError({
        code: 'upstream_invalid_response',
        message: 'Connector returned an invalid tool catalog payload',
        retryable: false,
        details: {
          connectorId: input.connector.id,
        },
      });
    }

    const discoveredAt = new Date().toISOString();
    return {
      discoveredAt,
      tools: rawTools.map((tool) =>
        normalizeToolDescriptor(input.connector, tool, discoveredAt),
      ),
    };
  }

  async invokeTool(
    input: ManagedConnectorInvocationInput,
  ): Promise<ManagedConnectorInvocationOutput> {
    const headers = await this.buildHeaders(input.connector);
    const response = await fetchWithTimeout(
      `${normalizeConnectorBaseUrl(input.connector.baseUrl)}/mcp/tool`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify({
          name: input.tool.name,
          parameters: input.arguments,
        }),
      },
      input.timeoutMs ?? 30_000,
    );

    if (!response.ok) {
      const details = await safeReadErrorBody(response);
      throw new ManagedConnectorAdapterError({
        code: response.status === 401 ? 'connector_auth_failed' : 'upstream_execution_failed',
        message: `Connector tool invocation failed: ${response.status} ${response.statusText}`,
        retryable: response.status >= 500 || response.status === 429,
        details: {
          connectorId: input.connector.id,
          toolName: input.tool.name,
          upstream: details,
        },
      });
    }

    const output = (await response.json()) as unknown;
    return {
      output,
      outputText: extractOutputText(output),
      retries: 0,
    };
  }

  private async buildHeaders(
    connector: MCPConnectorRecord,
  ): Promise<Record<string, string>> {
    if (connector.authMode === 'none') {
      return {};
    }

    const secret = await this.secretResolver.resolve(connector);
    const token = secret?.accessToken ?? secret?.apiKey;

    if (!token && !secret?.headers) {
      throw new ManagedConnectorAdapterError({
        code: 'connector_auth_failed',
        message: 'Connector secret is unavailable',
        retryable: false,
        details: {
          connectorId: connector.id,
        },
      });
    }

    return {
      ...buildMcpHeaders(token),
      ...(secret?.headers ?? {}),
    };
  }
}

function normalizeToolDescriptor(
  connector: MCPConnectorRecord,
  rawTool: unknown,
  discoveredAt: string,
): MCPToolDescriptor {
  const tool =
    rawTool && typeof rawTool === 'object'
      ? (rawTool as Record<string, unknown>)
      : {};

  const name = typeof tool.name === 'string' ? tool.name : 'unknown_tool';
  const description =
    typeof tool.description === 'string'
      ? tool.description
      : 'No connector tool description provided.';

  const mutationMode = inferMutationMode(name, description);
  const riskTier = inferRiskTier(connector.riskTier, mutationMode);

  return {
    connectorId: connector.id,
    name,
    title: typeof tool.title === 'string' ? tool.title : null,
    description,
    inputSchema:
      tool.parameters && typeof tool.parameters === 'object'
        ? (tool.parameters as Record<string, unknown>)
        : {},
    outputSchema:
      tool.outputSchema && typeof tool.outputSchema === 'object'
        ? (tool.outputSchema as Record<string, unknown>)
        : null,
    mutationMode,
    riskTier,
    status: 'enabled',
    metadata: tool,
    discoveredAt,
  };
}

function inferMutationMode(
  name: string,
  description: string,
): MCPToolMutationMode {
  const candidate = `${name} ${description}`.toLowerCase();

  if (
    candidate.includes('delete') ||
    candidate.includes('remove') ||
    candidate.includes('update') ||
    candidate.includes('create') ||
    candidate.includes('write') ||
    candidate.includes('generate') ||
    candidate.includes('upload')
  ) {
    return 'write';
  }

  if (
    candidate.includes('admin') ||
    candidate.includes('configure') ||
    candidate.includes('billing')
  ) {
    return 'admin';
  }

  return 'read';
}

function inferRiskTier(
  connectorRiskTier: MCPConnectorRiskTier,
  mutationMode: MCPToolMutationMode,
): MCPConnectorRiskTier {
  if (mutationMode === 'admin') {
    return 'critical';
  }

  if (mutationMode === 'write' && connectorRiskTier === 'low') {
    return 'moderate';
  }

  return connectorRiskTier;
}

function normalizeConnectorBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/$/, '');
}

async function safeReadErrorBody(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    try {
      return await response.text();
    } catch {
      return null;
    }
  }
}

function extractOutputText(output: unknown): string | undefined {
  if (typeof output === 'string') {
    return output;
  }

  if (
    output &&
    typeof output === 'object' &&
    typeof (output as Record<string, unknown>).text === 'string'
  ) {
    return (output as Record<string, string>).text;
  }

  return undefined;
}
