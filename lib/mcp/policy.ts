import type {
  MCPConnectorRecord,
  MCPConnectorRiskTier,
  MCPGatewayInvokeRequest,
  MCPPolicyDecision,
  MCPToolDescriptor,
} from './gateway-contract';

export interface MCPPolicyEvaluationContext {
  connector: MCPConnectorRecord;
  request: MCPGatewayInvokeRequest;
  tool: MCPToolDescriptor | null;
}

export interface MCPPolicyEvaluator {
  evaluate(context: MCPPolicyEvaluationContext): Promise<MCPPolicyDecision>;
}

export class DefaultMCPPolicyEvaluator implements MCPPolicyEvaluator {
  async evaluate(
    context: MCPPolicyEvaluationContext,
  ): Promise<MCPPolicyDecision> {
    const effectiveRiskTier = maxRiskTier(
      context.connector.riskTier,
      context.tool?.riskTier ?? context.connector.riskTier,
    );

    if (context.connector.status === 'disabled') {
      return {
        decision: 'deny',
        reasonCode: 'connector_disabled',
        matchedPolicyIds: [],
        effectiveRiskTier,
      };
    }

    if (context.connector.status === 'revoked') {
      return {
        decision: 'deny',
        reasonCode: 'connector_revoked',
        matchedPolicyIds: [],
        effectiveRiskTier,
      };
    }

    if (!context.tool || context.tool.status !== 'enabled') {
      return {
        decision: 'deny',
        reasonCode: 'tool_disabled',
        matchedPolicyIds: [],
        effectiveRiskTier,
      };
    }

    if (
      (context.tool.mutationMode === 'write' ||
        context.tool.mutationMode === 'admin') &&
      !context.request.confirmationToken
    ) {
      return {
        decision: 'confirm_required',
        reasonCode: 'confirmation_required',
        matchedPolicyIds: [],
        effectiveRiskTier,
      };
    }

    return {
      decision: 'allow',
      reasonCode: null,
      matchedPolicyIds: [],
      effectiveRiskTier,
    };
  }
}

function maxRiskTier(
  left: MCPConnectorRiskTier,
  right: MCPConnectorRiskTier,
): MCPConnectorRiskTier {
  const order: MCPConnectorRiskTier[] = [
    'low',
    'moderate',
    'high',
    'critical',
  ];

  return order[Math.max(order.indexOf(left), order.indexOf(right))];
}
