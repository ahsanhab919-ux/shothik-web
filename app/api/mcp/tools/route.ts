import { NextRequest, NextResponse } from 'next/server';

import { createCreativeStudioGateway } from '@/lib/mcp/runtime';
import { resolveShothikNativeConnectorId } from '@/lib/mcp/connectors/shothik-native';
import { authenticateMcpRequest } from '@/lib/mcp/request-auth';

export async function GET(request: NextRequest) {
  const auth = await authenticateMcpRequest(request);
  if (!auth.authenticated || !auth.tenantId) {
    return NextResponse.json(
      {
        error: 'AUTHENTICATION_REQUIRED',
        message: 'Please sign in to access MCP tools.',
      },
      { status: 401 },
    );
  }

  const gateway = createCreativeStudioGateway();
  const connectorId = resolveShothikNativeConnectorId(auth.tenantId);
  const discovery = await gateway.discoverTools({
    tenantId: auth.tenantId,
    userId: auth.userId ?? null,
    origin: auth.origin,
    connectorId,
  });

  if (discovery.status === 'failed') {
    return NextResponse.json(
      {
        error: discovery.error?.code ?? 'MCP_DISCOVERY_FAILED',
        message: discovery.error?.message ?? 'Failed to discover MCP tools.',
      },
      { status: discovery.error?.code === 'connector_not_found' ? 404 : 503 },
    );
  }

  const tools = discovery.tools.map((tool) => {
    const metadata =
      tool.metadata && typeof tool.metadata === 'object'
        ? (tool.metadata as Record<string, unknown>)
        : {};
    if (metadata.hostExposure === 'internal') {
      return null;
    }

    return {
      name: tool.name,
      title: tool.title,
      description: tool.description,
      parameters: tool.inputSchema,
      outputSchema: tool.outputSchema ?? null,
    };
  }).filter((tool): tool is NonNullable<typeof tool> => tool !== null);

  return NextResponse.json(tools);
}
