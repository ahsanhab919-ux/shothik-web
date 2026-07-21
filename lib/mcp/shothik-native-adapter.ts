import { cookies, headers } from 'next/headers';

import { fetchWithTimeout } from '@/lib/mcp/config';
import { listShothikNativeMcpTools } from '@/lib/mcp/native-tools';

import type { MCPToolDescriptor } from './gateway-contract';
import {
  ManagedConnectorAdapterError,
  type ManagedConnectorDiscoveryInput,
  type ManagedConnectorDiscoveryOutput,
  type ManagedConnectorInvocationInput,
  type ManagedConnectorInvocationOutput,
  type ManagedMCPConnectorAdapter,
} from './managed-connector-adapter';

export class ShothikNativeConnectorAdapter implements ManagedMCPConnectorAdapter {
  readonly adapterKey: string;

  constructor(adapterKey: string) {
    this.adapterKey = adapterKey;
  }

  async discoverTools(
    input: ManagedConnectorDiscoveryInput,
  ): Promise<ManagedConnectorDiscoveryOutput> {
    const discoveredAt = new Date().toISOString();
    return {
      discoveredAt,
      tools: listShothikNativeMcpTools(input.connector.tenantId, discoveredAt),
    };
  }

  async invokeTool(
    input: ManagedConnectorInvocationInput,
  ): Promise<ManagedConnectorInvocationOutput> {
    const routePath = getRoutePath(input.tool);
    const baseOrigin = resolveAppOrigin(input.connector);
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(await resolveCookieHeader()),
      ...(await resolveAuthorizationHeader()),
    };

    const response = await fetchWithTimeout(
      `${baseOrigin}${routePath}`,
      {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify(input.arguments ?? {}),
      },
      input.timeoutMs ?? 30_000,
    );

    const output = await safeReadJson(response);

    if (!response.ok) {
      throw new ManagedConnectorAdapterError({
        code: response.status === 401 ? 'connector_auth_failed' : 'upstream_execution_failed',
        message: `Native tool invocation failed: ${response.status} ${response.statusText}`,
        retryable: response.status >= 500 || response.status === 429,
        details: {
          connectorId: input.connector.id,
          toolName: input.tool.name,
          status: response.status,
          output,
        },
      });
    }

    return {
      output,
      outputText: typeof output === 'string' ? output : undefined,
      retries: 0,
    };
  }
}

function getRoutePath(tool: MCPToolDescriptor): string {
  const metadata =
    tool.metadata && typeof tool.metadata === 'object'
      ? (tool.metadata as Record<string, unknown>)
      : {};
  const routePath = typeof metadata.routePath === 'string' ? metadata.routePath : '';

  if (!routePath.startsWith('/')) {
    throw new ManagedConnectorAdapterError({
      code: 'upstream_invalid_response',
      message: `Native tool ${tool.name} is missing a routePath binding.`,
      retryable: false,
      details: {
        toolName: tool.name,
      },
    });
  }

  return routePath;
}

function resolveAppOrigin(connector: { metadata?: Record<string, unknown> }): string {
  const metadata =
    connector.metadata && typeof connector.metadata === 'object'
      ? (connector.metadata as Record<string, unknown>)
      : {};
  const configured =
    typeof metadata.appOrigin === 'string' ? metadata.appOrigin.trim() : '';

  if (configured) {
    return configured.replace(/\/+$/, '');
  }

  const fallback = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fallback) {
    return fallback.replace(/\/+$/, '');
  }

  return 'http://localhost:3000';
}

async function resolveCookieHeader(): Promise<Record<string, string>> {
  try {
    const store = await cookies();
    const all =
      typeof (store as any).getAll === 'function'
        ? ((store as any).getAll() as { name: string; value: string }[])
        : [];
    const cookieHeader = all.map((cookie) => `${cookie.name}=${cookie.value}`).join('; ');
    return cookieHeader ? { Cookie: cookieHeader } : {};
  } catch {
    return {};
  }
}

async function resolveAuthorizationHeader(): Promise<Record<string, string>> {
  try {
    const headerStore = await headers();
    const authorization = headerStore.get('authorization')?.trim() ?? '';
    if (!authorization.startsWith('Bearer shothik_agent_')) {
      return {};
    }

    return {
      Authorization: authorization,
    };
  } catch {
    return {};
  }
}

async function safeReadJson(response: Response): Promise<unknown> {
  const raw = await response.text();
  if (!raw) return null;

  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return raw;
  }
}
