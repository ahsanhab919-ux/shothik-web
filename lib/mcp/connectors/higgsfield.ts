import type {
  MCPConnectorRecord,
  MCPConnectorStatus,
} from '../gateway-contract';

export const HIGGSFIELD_CONNECTOR_SLUG = 'higgsfield';
export const HIGGSFIELD_MANAGED_ADAPTER_KEY = 'managed_remote_http';

export function resolveHiggsfieldConnectorId(tenantId: string): string {
  return `${HIGGSFIELD_CONNECTOR_SLUG}:${tenantId}`;
}

export const HIGGSFIELD_MANAGED_CONNECTOR_DEFINITION = {
  slug: HIGGSFIELD_CONNECTOR_SLUG,
  displayName: 'Higgsfield MCP',
  provider: 'Higgsfield',
  adapterKey: HIGGSFIELD_MANAGED_ADAPTER_KEY,
  transport: 'streamable_http',
  authMode: 'api_key',
  riskTier: 'high',
  category: 'creative_media',
  workflowTarget: 'shothik-creative-studio',
  description:
    'Managed external MCP connector scaffold for creative media generation workflows.',
  toolHints: [
    'image generation',
    'video generation',
    'creative transformation',
  ],
} as const;

export interface CreateHiggsfieldConnectorOptions {
  id?: string;
  tenantId: string;
  baseUrl: string;
  ownerUserId?: string | null;
  secretRef?: string | null;
  status?: MCPConnectorStatus;
}

export function createHiggsfieldManagedConnector(
  options: CreateHiggsfieldConnectorOptions,
): MCPConnectorRecord {
  const timestamp = new Date().toISOString();

  return {
    id: options.id ?? resolveHiggsfieldConnectorId(options.tenantId),
    tenantId: options.tenantId,
    slug: HIGGSFIELD_CONNECTOR_SLUG,
    displayName: HIGGSFIELD_MANAGED_CONNECTOR_DEFINITION.displayName,
    source: 'shothik_managed',
    transport: HIGGSFIELD_MANAGED_CONNECTOR_DEFINITION.transport,
    authMode: HIGGSFIELD_MANAGED_CONNECTOR_DEFINITION.authMode,
    baseUrl: options.baseUrl.replace(/\/$/, ''),
    riskTier: HIGGSFIELD_MANAGED_CONNECTOR_DEFINITION.riskTier,
    status: options.status ?? 'draft',
    capabilityStatus: 'unknown',
    ownerUserId: options.ownerUserId ?? null,
    secretRef: options.secretRef ?? null,
    metadata: {
      adapterKey: HIGGSFIELD_MANAGED_CONNECTOR_DEFINITION.adapterKey,
      provider: HIGGSFIELD_MANAGED_CONNECTOR_DEFINITION.provider,
      category: HIGGSFIELD_MANAGED_CONNECTOR_DEFINITION.category,
      workflowTarget: HIGGSFIELD_MANAGED_CONNECTOR_DEFINITION.workflowTarget,
      toolHints: HIGGSFIELD_MANAGED_CONNECTOR_DEFINITION.toolHints,
      managed: true,
    },
    lastDiscoveredAt: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}
