export type MCPConnectorSource =
  | 'shothik_managed'
  | 'tenant_managed'
  | 'shothik_native';

export type MCPConnectorTransport =
  | 'streamable_http'
  | 'sse'
  | 'stdio'
  | 'custom';

export type MCPConnectorAuthMode =
  | 'none'
  | 'api_key'
  | 'oauth2'
  | 'service_token';

export type MCPConnectorRiskTier = 'low' | 'moderate' | 'high' | 'critical';

export type MCPConnectorStatus =
  | 'draft'
  | 'active'
  | 'disabled'
  | 'revoked'
  | 'error';

export type MCPConnectorCapabilityStatus =
  | 'unknown'
  | 'refreshing'
  | 'ready'
  | 'degraded';

export type MCPToolMutationMode = 'read' | 'write' | 'admin';

export type MCPToolStatus = 'enabled' | 'disabled' | 'hidden';

export type MCPPolicyEffect = 'allow' | 'deny' | 'confirm' | 'meter';

export type MCPPolicyDecisionResult =
  | 'allow'
  | 'deny'
  | 'confirm_required';

export type MCPPolicyReasonCode =
  | 'connector_disabled'
  | 'connector_revoked'
  | 'tool_disabled'
  | 'tool_not_allowlisted'
  | 'role_not_allowed'
  | 'confirmation_required'
  | 'quota_exceeded'
  | 'rate_limited'
  | 'concurrency_limited'
  | 'secret_unavailable';

export type MCPInvocationOrigin =
  | 'server_action'
  | 'api_route'
  | 'workflow_orchestrator'
  | 'mcp_host';

export type MCPInvocationStatus = 'success' | 'blocked' | 'failed';

export type MCPDiscoveryStatus = 'success' | 'degraded' | 'failed';

export type MCPAuditStatus = 'started' | 'success' | 'blocked' | 'failed';

export type MCPGatewayErrorCode =
  | 'connector_not_found'
  | 'connector_unavailable'
  | 'connector_auth_failed'
  | 'tool_not_found'
  | 'policy_denied'
  | 'confirmation_required'
  | 'rate_limited'
  | 'timeout'
  | 'upstream_invalid_response'
  | 'upstream_execution_failed';

export interface MCPConnectorRecord {
  id: string;
  tenantId: string;
  slug: string;
  displayName: string;
  source: MCPConnectorSource;
  transport: MCPConnectorTransport;
  authMode: MCPConnectorAuthMode;
  baseUrl: string;
  riskTier: MCPConnectorRiskTier;
  status: MCPConnectorStatus;
  capabilityStatus: MCPConnectorCapabilityStatus;
  ownerUserId: string | null;
  secretRef: string | null;
  metadata: Record<string, unknown>;
  lastDiscoveredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MCPConnectorSecretRef {
  id: string;
  connectorId: string;
  tenantId: string;
  authMode: MCPConnectorAuthMode;
  providerKey: string;
  version: number;
  status: 'active' | 'rotating' | 'revoked';
  lastValidatedAt: string | null;
  expiresAt: string | null;
}

export interface MCPToolDescriptor {
  connectorId: string;
  name: string;
  title: string | null;
  description: string;
  inputSchema: Record<string, unknown>;
  outputSchema?: Record<string, unknown> | null;
  mutationMode: MCPToolMutationMode;
  riskTier: MCPConnectorRiskTier;
  status: MCPToolStatus;
  metadata: Record<string, unknown>;
  discoveredAt: string;
}

export interface MCPConnectorPolicyRecord {
  id: string;
  tenantId: string;
  connectorId: string;
  toolName: string | null;
  effect: MCPPolicyEffect;
  mutationMode: MCPToolMutationMode | null;
  maxCallsPerMinute: number | null;
  maxConcurrentCalls: number | null;
  requiresConfirmedUserAction: boolean;
  allowedRoles: string[];
  metadata: Record<string, unknown>;
}

export interface MCPPolicyDecision {
  decision: MCPPolicyDecisionResult;
  reasonCode: MCPPolicyReasonCode | null;
  matchedPolicyIds: string[];
  effectiveRiskTier: MCPConnectorRiskTier;
  quotaSnapshot?: Record<string, unknown> | null;
}

export interface MCPGatewayInvokeRequest {
  tenantId: string;
  userId: string | null;
  connectorId: string;
  toolName: string;
  arguments: Record<string, unknown>;
  idempotencyKey?: string;
  traceId?: string;
  origin: MCPInvocationOrigin;
  dryRun?: boolean;
  confirmationToken?: string;
  timeoutMs?: number;
}

export interface MCPGatewayMetrics {
  durationMs: number;
  retries: number;
  estimatedCostUsd?: number;
}

export interface MCPGatewayError {
  code: MCPGatewayErrorCode;
  message: string;
  retryable: boolean;
  details?: Record<string, unknown>;
}

export interface MCPGatewayInvokeResult {
  invocationId: string;
  connectorId: string;
  toolName: string;
  status: MCPInvocationStatus;
  output: unknown;
  outputText?: string;
  policyDecision: MCPPolicyDecision;
  metrics: MCPGatewayMetrics;
  error?: MCPGatewayError;
}

export interface MCPGatewayDiscoveryRequest {
  tenantId: string;
  connectorId: string;
  userId?: string | null;
  origin?: MCPInvocationOrigin;
  forceRefresh?: boolean;
  traceId?: string;
}

export interface MCPGatewayDiscoveryResult {
  connectorId: string;
  discoveredAt: string;
  status: MCPDiscoveryStatus;
  tools: MCPToolDescriptor[];
  error?: MCPGatewayError;
}

export interface MCPAuditEvent {
  eventId: string;
  eventType: string;
  timestamp: string;
  traceId: string | null;
  tenantId: string;
  userId: string | null;
  connectorId: string;
  toolName: string | null;
  origin: MCPInvocationOrigin;
  status: MCPAuditStatus;
  riskTier: MCPConnectorRiskTier | null;
  durationMs: number | null;
  policyReasonCode: MCPPolicyReasonCode | null;
  estimatedCostUsd: number | null;
  requestBytes: number | null;
  responseBytes: number | null;
  metadata: Record<string, unknown>;
}

export interface MCPGateway {
  discoverTools(
    request: MCPGatewayDiscoveryRequest,
  ): Promise<MCPGatewayDiscoveryResult>;
  invokeTool(request: MCPGatewayInvokeRequest): Promise<MCPGatewayInvokeResult>;
}
