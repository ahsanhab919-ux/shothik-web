import { describe, expect, it, vi } from 'vitest';

import type { MCPGateway } from '../mcp/gateway-contract';
import { runCreativeStudioWorkflow } from '../mcp/creative-studio';

describe('runCreativeStudioWorkflow', () => {
  it('uses the default video tool and passes confirmation to the gateway', async () => {
    const gateway: MCPGateway = {
      discoverTools: vi.fn(),
      invokeTool: vi.fn().mockResolvedValue({
        invocationId: 'invoke-1',
        connectorId: 'higgsfield:tenant-1',
        toolName: 'generate_video',
        status: 'success',
        output: { jobId: 'job-1' },
        outputText: 'Queued',
        policyDecision: {
          decision: 'allow',
          reasonCode: null,
          matchedPolicyIds: [],
          effectiveRiskTier: 'high',
        },
        metrics: {
          durationMs: 20,
          retries: 0,
        },
      }),
    };

    const result = await runCreativeStudioWorkflow(
      {
        tenantId: 'tenant-1',
        userId: 'user-1',
        prompt: 'Create a cinematic trailer',
        assetType: 'video',
        confirmed: true,
      },
      { gateway },
    );

    expect(result.status).toBe('success');
    expect(result.toolName).toBe('generate_video');
    expect(gateway.invokeTool).toHaveBeenCalledWith(
      expect.objectContaining({
        connectorId: 'higgsfield:tenant-1',
        toolName: 'generate_video',
        confirmationToken: 'confirmed',
      }),
    );
  });

  it('returns a dry-run plan without invoking the gateway', async () => {
    const gateway: MCPGateway = {
      discoverTools: vi.fn(),
      invokeTool: vi.fn(),
    };

    const result = await runCreativeStudioWorkflow(
      {
        tenantId: 'tenant-1',
        userId: 'user-1',
        prompt: 'Create a vibrant cover art concept',
        assetType: 'image',
        style: 'editorial',
        dryRun: true,
      },
      { gateway },
    );

    expect(result.status).toBe('success');
    expect(result.output).toMatchObject({
      planned: true,
      connectorId: 'higgsfield:tenant-1',
      toolName: 'generate_image',
      arguments: {
        prompt: 'Create a vibrant cover art concept',
        style: 'editorial',
        assetType: 'image',
      },
    });
    expect(gateway.invokeTool).not.toHaveBeenCalled();
  });

  it('marks confirmation-required gateway blocks for the route layer', async () => {
    const gateway: MCPGateway = {
      discoverTools: vi.fn(),
      invokeTool: vi.fn().mockResolvedValue({
        invocationId: 'invoke-2',
        connectorId: 'higgsfield:tenant-1',
        toolName: 'generate_image',
        status: 'blocked',
        output: null,
        policyDecision: {
          decision: 'confirm_required',
          reasonCode: 'confirmation_required',
          matchedPolicyIds: [],
          effectiveRiskTier: 'high',
        },
        metrics: {
          durationMs: 0,
          retries: 0,
        },
      }),
    };

    const result = await runCreativeStudioWorkflow(
      {
        tenantId: 'tenant-1',
        userId: 'user-1',
        prompt: 'Create a new product teaser image',
        assetType: 'image',
      },
      { gateway },
    );

    expect(result.status).toBe('blocked');
    expect(result.confirmationRequired).toBe(true);
    expect(result.policyReasonCode).toBe('confirmation_required');
  });
});
