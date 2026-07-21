import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createCreativeStudioGateway } from '@/lib/mcp/runtime';
import { resolveShothikNativeConnectorId } from '@/lib/mcp/connectors/shothik-native';
import { isPublicShothikNativeMcpTool } from '@/lib/mcp/native-tools';
import { authenticateMcpRequest } from '@/lib/mcp/request-auth';

const toolInvocationSchema = z.object({
  name: z.string().trim().min(1).max(200),
  parameters: z.record(z.string(), z.unknown()).optional(),
  confirmationToken: z.string().trim().min(1).max(400).optional(),
  dryRun: z.boolean().optional(),
  timeoutMs: z.number().int().positive().max(120_000).optional(),
  traceId: z.string().trim().min(1).max(200).optional(),
});

export async function POST(request: NextRequest) {
  const auth = await authenticateMcpRequest(request);
  if (!auth.authenticated || !auth.tenantId) {
    return NextResponse.json(
      {
        error: 'AUTHENTICATION_REQUIRED',
        message: 'Please authenticate to invoke MCP tools.',
      },
      { status: 401 },
    );
  }

  let rawBody: unknown = {};
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: 'INVALID_REQUEST',
        message: 'Request body must be valid JSON.',
      },
      { status: 400 },
    );
  }

  const parsed = toolInvocationSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'INVALID_REQUEST',
        message: 'MCP tool invocation request is invalid.',
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  if (!isPublicShothikNativeMcpTool(parsed.data.name)) {
    return NextResponse.json(
      {
        error: 'TOOL_NOT_FOUND',
        message: 'Requested MCP tool is not available.',
      },
      { status: 404 },
    );
  }

  const tenantId = auth.tenantId;
  const connectorId = resolveShothikNativeConnectorId(tenantId);
  const gateway = createCreativeStudioGateway();

  const invocation = await gateway.invokeTool({
    tenantId,
    userId: auth.userId ?? null,
    origin: auth.origin ?? 'mcp_host',
    connectorId,
    toolName: parsed.data.name,
    arguments: parsed.data.parameters ?? {},
    dryRun: parsed.data.dryRun,
    confirmationToken: parsed.data.confirmationToken,
    timeoutMs: parsed.data.timeoutMs,
    traceId: parsed.data.traceId,
  });

  if (invocation.status === 'blocked' && invocation.policyDecision?.decision === 'confirm_required') {
    return NextResponse.json(
      {
        success: false,
        error: 'MCP_CONFIRMATION_REQUIRED',
        message: 'This MCP action requires explicit confirmation before execution.',
        connectorId: invocation.connectorId,
        toolName: invocation.toolName,
        policyReasonCode: invocation.policyDecision.reasonCode,
      },
      { status: 409 },
    );
  }

  if (invocation.status === 'blocked') {
    return NextResponse.json(
      {
        success: false,
        error: invocation.policyDecision?.reasonCode ?? 'MCP_WORKFLOW_BLOCKED',
        message: 'MCP tool invocation was blocked by policy.',
        connectorId: invocation.connectorId,
        toolName: invocation.toolName,
        policyReasonCode: invocation.policyDecision?.reasonCode ?? null,
      },
      { status: 403 },
    );
  }

  if (invocation.status === 'failed') {
    return NextResponse.json(
      {
        success: false,
        error: invocation.error?.code ?? 'MCP_WORKFLOW_FAILED',
        message: invocation.error?.message ?? 'MCP tool invocation failed.',
        connectorId: invocation.connectorId,
        toolName: invocation.toolName,
        retryable: invocation.error?.retryable ?? false,
      },
      { status: mapFailureStatus(invocation.error?.code) },
    );
  }

  return NextResponse.json({
    success: true,
    connectorId: invocation.connectorId,
    toolName: invocation.toolName,
    invocationId: invocation.invocationId,
    output: invocation.output,
    outputText: invocation.outputText,
  });
}

function mapFailureStatus(errorCode?: string): number {
  switch (errorCode) {
    case 'connector_not_configured':
    case 'connector_auth_failed':
    case 'connector_unavailable':
      return 503;
    case 'tool_not_found':
      return 404;
    case 'timeout':
      return 504;
    default:
      return 502;
  }
}
