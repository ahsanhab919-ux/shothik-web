import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { runCreativeStudioWorkflow } from '@/lib/mcp/creative-studio';
import { getAuthenticatedUser } from '@/lib/server-auth';

const creativeStudioRequestSchema = z.object({
  prompt: z.string().trim().min(1).max(4000),
  assetType: z.enum(['image', 'video']),
  style: z.string().trim().min(1).max(200).optional(),
  toolName: z.string().trim().min(1).max(200).optional(),
  confirmed: z.boolean().optional(),
  dryRun: z.boolean().optional(),
  traceId: z.string().trim().min(1).max(200).optional(),
});

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user?._id) {
    return NextResponse.json(
      {
        error: 'AUTHENTICATION_REQUIRED',
        message: 'Please sign in to use Creative Studio.',
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

  const parsed = creativeStudioRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'INVALID_REQUEST',
        message: 'Creative Studio request is invalid.',
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const workflow = await runCreativeStudioWorkflow({
    tenantId: String(user._id),
    userId: String(user._id),
    ...parsed.data,
  });

  if (workflow.status === 'blocked' && workflow.confirmationRequired) {
    return NextResponse.json(
      {
        success: false,
        error: 'MCP_CONFIRMATION_REQUIRED',
        message:
          'This Creative Studio action requires explicit confirmation before execution.',
        connectorId: workflow.connectorId,
        toolName: workflow.toolName,
        policyReasonCode: workflow.policyReasonCode,
      },
      { status: 409 },
    );
  }

  if (workflow.status === 'blocked') {
    return NextResponse.json(
      {
        success: false,
        error: workflow.policyReasonCode ?? 'MCP_WORKFLOW_BLOCKED',
        message: 'Creative Studio workflow was blocked by policy.',
        connectorId: workflow.connectorId,
        toolName: workflow.toolName,
        policyReasonCode: workflow.policyReasonCode,
      },
      { status: mapWorkflowBlockedStatus(workflow.policyReasonCode) },
    );
  }

  if (workflow.status === 'failed') {
    return NextResponse.json(
      {
        success: false,
        error: workflow.error?.code ?? 'MCP_WORKFLOW_FAILED',
        message: workflow.error?.message ?? 'Creative Studio workflow failed.',
        connectorId: workflow.connectorId,
        toolName: workflow.toolName,
        retryable: workflow.error?.retryable ?? false,
      },
      { status: mapWorkflowFailureStatus(workflow.error?.code) },
    );
  }

  return NextResponse.json({
    success: true,
    status: workflow.status,
    connectorId: workflow.connectorId,
    toolName: workflow.toolName,
    invocationId: workflow.invocationId,
    confirmationRequired: workflow.confirmationRequired,
    output: workflow.output,
    outputText: workflow.outputText,
  });
}

function mapWorkflowFailureStatus(errorCode?: string): number {
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

function mapWorkflowBlockedStatus(reasonCode?: string | null): number {
  switch (reasonCode) {
    case 'connector_disabled':
    case 'connector_revoked':
    case 'tool_disabled':
      return 403;
    case 'confirmation_required':
      return 409;
    default:
      return 403;
  }
}
