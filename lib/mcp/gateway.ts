import { logger } from '@/lib/logger';

import type {
  MCPAuditEvent,
  MCPConnectorRecord,
  MCPGateway,
  MCPGatewayDiscoveryRequest,
  MCPGatewayDiscoveryResult,
  MCPGatewayError,
  MCPGatewayErrorCode,
  MCPGatewayInvokeRequest,
  MCPGatewayInvokeResult,
  MCPPolicyDecision,
  MCPToolDescriptor,
} from './gateway-contract';
import type {
  ManagedConnectorAdapterRegistry,
  ManagedConnectorAdapterError,
  ManagedMCPConnectorAdapter,
} from './managed-connector-adapter';
import { DefaultMCPPolicyEvaluator, type MCPPolicyEvaluator } from './policy';

export interface MCPConnectorRegistry {
  getConnector(
    tenantId: string,
    connectorId: string,
  ): Promise<MCPConnectorRecord | null>;
}

export interface MCPToolCatalogRepository {
  getTool(
    connectorId: string,
    toolName: string,
  ): Promise<MCPToolDescriptor | null>;
  upsertTools(connectorId: string, tools: MCPToolDescriptor[]): Promise<void>;
}

export interface MCPAuditWriter {
  write(event: MCPAuditEvent): Promise<void>;
}

export interface ServerMCPGatewayOptions {
  adapterRegistry: ManagedConnectorAdapterRegistry;
  connectorRegistry: MCPConnectorRegistry;
  toolCatalogRepository?: MCPToolCatalogRepository;
  policyEvaluator?: MCPPolicyEvaluator;
  auditWriter?: MCPAuditWriter;
  idGenerator?: () => string;
  now?: () => Date;
}

export class ServerMCPGateway implements MCPGateway {
  private readonly toolCatalogRepository?: MCPToolCatalogRepository;

  private readonly policyEvaluator: MCPPolicyEvaluator;

  private readonly auditWriter?: MCPAuditWriter;

  private readonly idGenerator: () => string;

  private readonly now: () => Date;

  constructor(private readonly options: ServerMCPGatewayOptions) {
    this.toolCatalogRepository = options.toolCatalogRepository;
    this.policyEvaluator =
      options.policyEvaluator ?? new DefaultMCPPolicyEvaluator();
    this.auditWriter = options.auditWriter;
    this.idGenerator = options.idGenerator ?? (() => crypto.randomUUID());
    this.now = options.now ?? (() => new Date());
  }

  async discoverTools(
    request: MCPGatewayDiscoveryRequest,
  ): Promise<MCPGatewayDiscoveryResult> {
    const traceId = request.traceId ?? this.idGenerator();
    const connector = await this.options.connectorRegistry.getConnector(
      request.tenantId,
      request.connectorId,
    );

    if (!connector) {
      return {
        connectorId: request.connectorId,
        discoveredAt: this.now().toISOString(),
        status: 'failed',
        tools: [],
        error: this.createGatewayError(
          'connector_not_found',
          `Connector ${request.connectorId} was not found`,
          false,
        ),
      };
    }

    const adapter = this.options.adapterRegistry.getAdapter(connector);
    if (!adapter) {
      return {
        connectorId: connector.id,
        discoveredAt: this.now().toISOString(),
        status: 'failed',
        tools: [],
        error: this.createGatewayError(
          'connector_unavailable',
          `No managed adapter is registered for connector ${connector.slug}`,
          false,
        ),
      };
    }

    await this.writeAuditEvent({
      eventId: this.idGenerator(),
      eventType: 'mcp.connector.discovery.started',
      timestamp: this.now().toISOString(),
      traceId,
      tenantId: request.tenantId,
      userId: request.userId ?? null,
      connectorId: connector.id,
      toolName: null,
      origin: request.origin ?? 'workflow_orchestrator',
      status: 'started',
      riskTier: connector.riskTier,
      durationMs: null,
      policyReasonCode: null,
      estimatedCostUsd: null,
      requestBytes: null,
      responseBytes: null,
      metadata: {
        forceRefresh: request.forceRefresh ?? false,
      },
    });

    const startedAt = Date.now();

    try {
      const result = await adapter.discoverTools({
        connector,
        forceRefresh: request.forceRefresh,
        traceId,
      });

      await this.toolCatalogRepository?.upsertTools(connector.id, result.tools);

      await this.writeAuditEvent({
        eventId: this.idGenerator(),
        eventType: 'mcp.connector.discovery.completed',
        timestamp: this.now().toISOString(),
        traceId,
        tenantId: request.tenantId,
        userId: request.userId ?? null,
        connectorId: connector.id,
        toolName: null,
        origin: request.origin ?? 'workflow_orchestrator',
        status: 'success',
        riskTier: connector.riskTier,
        durationMs: Date.now() - startedAt,
        policyReasonCode: null,
        estimatedCostUsd: null,
        requestBytes: null,
        responseBytes: null,
        metadata: {
          toolCount: result.tools.length,
        },
      });

      return {
        connectorId: connector.id,
        discoveredAt: result.discoveredAt,
        status: 'success',
        tools: result.tools,
      };
    } catch (error) {
      const normalized = this.normalizeAdapterError(error);
      logger.warn('[mcp-gateway] tool discovery failed', {
        connectorId: connector.id,
        error: normalized.message,
      });

      await this.writeAuditEvent({
        eventId: this.idGenerator(),
        eventType: 'mcp.connector.discovery.failed',
        timestamp: this.now().toISOString(),
        traceId,
        tenantId: request.tenantId,
        userId: request.userId ?? null,
        connectorId: connector.id,
        toolName: null,
        origin: request.origin ?? 'workflow_orchestrator',
        status: 'failed',
        riskTier: connector.riskTier,
        durationMs: Date.now() - startedAt,
        policyReasonCode: null,
        estimatedCostUsd: null,
        requestBytes: null,
        responseBytes: null,
        metadata: {
          errorCode: normalized.code,
        },
      });

      return {
        connectorId: connector.id,
        discoveredAt: this.now().toISOString(),
        status: 'failed',
        tools: [],
        error: normalized,
      };
    }
  }

  async invokeTool(
    request: MCPGatewayInvokeRequest,
  ): Promise<MCPGatewayInvokeResult> {
    const invocationId = this.idGenerator();
    const traceId = request.traceId ?? invocationId;
    const connector = await this.options.connectorRegistry.getConnector(
      request.tenantId,
      request.connectorId,
    );

    if (!connector) {
      return {
        invocationId,
        connectorId: request.connectorId,
        toolName: request.toolName,
        status: 'failed',
        output: null,
        policyDecision: this.failedPolicyDecision(),
        metrics: {
          durationMs: 0,
          retries: 0,
        },
        error: this.createGatewayError(
          'connector_not_found',
          `Connector ${request.connectorId} was not found`,
          false,
        ),
      };
    }

    const adapter = this.options.adapterRegistry.getAdapter(connector);
    if (!adapter) {
      return {
        invocationId,
        connectorId: connector.id,
        toolName: request.toolName,
        status: 'failed',
        output: null,
        policyDecision: this.failedPolicyDecision(connector.riskTier),
        metrics: {
          durationMs: 0,
          retries: 0,
        },
        error: this.createGatewayError(
          'connector_unavailable',
          `No managed adapter is registered for connector ${connector.slug}`,
          false,
        ),
      };
    }

    const tool = await this.resolveToolDescriptor(
      connector,
      adapter,
      request.toolName,
      traceId,
    );

    if (!tool) {
      return {
        invocationId,
        connectorId: connector.id,
        toolName: request.toolName,
        status: 'failed',
        output: null,
        policyDecision: this.failedPolicyDecision(connector.riskTier),
        metrics: {
          durationMs: 0,
          retries: 0,
        },
        error: this.createGatewayError(
          'tool_not_found',
          `Tool ${request.toolName} is not available for connector ${connector.slug}`,
          false,
        ),
      };
    }

    const policyDecision = await this.policyEvaluator.evaluate({
      connector,
      request,
      tool,
    });

    await this.writeAuditEvent({
      eventId: this.idGenerator(),
      eventType: 'mcp.tool.invocation.started',
      timestamp: this.now().toISOString(),
      traceId,
      tenantId: request.tenantId,
      userId: request.userId,
      connectorId: connector.id,
      toolName: tool.name,
      origin: request.origin,
      status: 'started',
      riskTier: policyDecision.effectiveRiskTier,
      durationMs: null,
      policyReasonCode: policyDecision.reasonCode,
      estimatedCostUsd: null,
      requestBytes: null,
      responseBytes: null,
      metadata: {
        dryRun: request.dryRun ?? false,
      },
    });

    if (policyDecision.decision !== 'allow') {
      await this.writeAuditEvent({
        eventId: this.idGenerator(),
        eventType: 'mcp.tool.invocation.blocked',
        timestamp: this.now().toISOString(),
        traceId,
        tenantId: request.tenantId,
        userId: request.userId,
        connectorId: connector.id,
        toolName: tool.name,
        origin: request.origin,
        status: 'blocked',
        riskTier: policyDecision.effectiveRiskTier,
        durationMs: 0,
        policyReasonCode: policyDecision.reasonCode,
        estimatedCostUsd: null,
        requestBytes: null,
        responseBytes: null,
        metadata: {},
      });

      return {
        invocationId,
        connectorId: connector.id,
        toolName: tool.name,
        status: 'blocked',
        output: null,
        policyDecision,
        metrics: {
          durationMs: 0,
          retries: 0,
        },
      };
    }

    const startedAt = Date.now();

    try {
      const result = await adapter.invokeTool({
        connector,
        tool,
        arguments: request.arguments,
        timeoutMs: request.timeoutMs,
        traceId,
      });

      await this.writeAuditEvent({
        eventId: this.idGenerator(),
        eventType: 'mcp.tool.invocation.completed',
        timestamp: this.now().toISOString(),
        traceId,
        tenantId: request.tenantId,
        userId: request.userId,
        connectorId: connector.id,
        toolName: tool.name,
        origin: request.origin,
        status: 'success',
        riskTier: policyDecision.effectiveRiskTier,
        durationMs: Date.now() - startedAt,
        policyReasonCode: null,
        estimatedCostUsd: result.estimatedCostUsd ?? null,
        requestBytes: null,
        responseBytes: null,
        metadata: {},
      });

      return {
        invocationId,
        connectorId: connector.id,
        toolName: tool.name,
        status: 'success',
        output: result.output,
        outputText: result.outputText,
        policyDecision,
        metrics: {
          durationMs: Date.now() - startedAt,
          retries: result.retries,
          estimatedCostUsd: result.estimatedCostUsd,
        },
      };
    } catch (error) {
      const normalized = this.normalizeAdapterError(error);
      logger.warn('[mcp-gateway] tool invocation failed', {
        connectorId: connector.id,
        toolName: tool.name,
        error: normalized.message,
      });

      await this.writeAuditEvent({
        eventId: this.idGenerator(),
        eventType: 'mcp.tool.invocation.failed',
        timestamp: this.now().toISOString(),
        traceId,
        tenantId: request.tenantId,
        userId: request.userId,
        connectorId: connector.id,
        toolName: tool.name,
        origin: request.origin,
        status: 'failed',
        riskTier: policyDecision.effectiveRiskTier,
        durationMs: Date.now() - startedAt,
        policyReasonCode: null,
        estimatedCostUsd: null,
        requestBytes: null,
        responseBytes: null,
        metadata: {
          errorCode: normalized.code,
        },
      });

      return {
        invocationId,
        connectorId: connector.id,
        toolName: tool.name,
        status: 'failed',
        output: null,
        policyDecision,
        metrics: {
          durationMs: Date.now() - startedAt,
          retries: 0,
        },
        error: normalized,
      };
    }
  }

  private async resolveToolDescriptor(
    connector: MCPConnectorRecord,
    adapter: ManagedMCPConnectorAdapter,
    toolName: string,
    traceId: string,
  ): Promise<MCPToolDescriptor | null> {
    const cachedTool = await this.toolCatalogRepository?.getTool(
      connector.id,
      toolName,
    );

    if (cachedTool) {
      return cachedTool;
    }

    try {
      const discovered = await adapter.discoverTools({
        connector,
        forceRefresh: false,
        traceId,
      });

      await this.toolCatalogRepository?.upsertTools(connector.id, discovered.tools);
      return discovered.tools.find((tool) => tool.name === toolName) ?? null;
    } catch (error) {
      logger.warn('[mcp-gateway] tool resolution fallback failed', {
        connectorId: connector.id,
        toolName,
        error: this.normalizeAdapterError(error).message,
      });
      return null;
    }
  }

  private async writeAuditEvent(event: MCPAuditEvent): Promise<void> {
    try {
      await this.auditWriter?.write(event);
    } catch (error) {
      logger.warn('[mcp-gateway] audit write failed', {
        eventType: event.eventType,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private normalizeAdapterError(error: unknown): MCPGatewayError {
    if (
      error &&
      typeof error === 'object' &&
      'gatewayError' in error &&
      (error as ManagedConnectorAdapterError).gatewayError
    ) {
      return (error as ManagedConnectorAdapterError).gatewayError;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      return this.createGatewayError(
        'timeout',
        'The connector invocation timed out',
        true,
      );
    }

    if (error instanceof Error) {
      return this.createGatewayError(
        'upstream_execution_failed',
        error.message,
        true,
      );
    }

    return this.createGatewayError(
      'upstream_execution_failed',
      'Unknown connector execution failure',
      true,
    );
  }

  private failedPolicyDecision(
    effectiveRiskTier: MCPConnectorRecord['riskTier'] = 'low',
  ): MCPPolicyDecision {
    return {
      decision: 'deny',
      reasonCode: null,
      matchedPolicyIds: [],
      effectiveRiskTier,
    };
  }

  private createGatewayError(
    code: MCPGatewayErrorCode,
    message: string,
    retryable: boolean,
  ): MCPGatewayError {
    return {
      code,
      message,
      retryable,
    };
  }
}
