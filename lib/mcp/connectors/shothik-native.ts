import type { MCPConnectorRecord, MCPConnectorStatus } from "../gateway-contract";

export const SHOTHIK_NATIVE_CONNECTOR_SLUG = "shothik-native";
export const SHOTHIK_NATIVE_CONNECTOR_BASE_URL = "shothik://native-tools";
export const SHOTHIK_NATIVE_ADAPTER_KEY = "shothik_native_http";

export function resolveShothikNativeConnectorId(tenantId: string): string {
  return `${SHOTHIK_NATIVE_CONNECTOR_SLUG}:${tenantId}`;
}

export interface CreateShothikNativeConnectorOptions {
  tenantId: string;
  id?: string;
  ownerUserId?: string | null;
  status?: MCPConnectorStatus;
}

export function createShothikNativeConnector(
  options: CreateShothikNativeConnectorOptions,
): MCPConnectorRecord {
  const timestamp = new Date().toISOString();
  const appOrigin = process.env.NEXT_PUBLIC_APP_URL?.trim() || null;

  return {
    id: options.id ?? resolveShothikNativeConnectorId(options.tenantId),
    tenantId: options.tenantId,
    slug: SHOTHIK_NATIVE_CONNECTOR_SLUG,
    displayName: "Shothik Native Tools",
    source: "shothik_native",
    transport: "custom",
    authMode: "none",
    baseUrl: SHOTHIK_NATIVE_CONNECTOR_BASE_URL,
    riskTier: "moderate",
    status: options.status ?? "active",
    capabilityStatus: "ready",
    ownerUserId: options.ownerUserId ?? null,
    secretRef: null,
    metadata: {
      adapterKey: SHOTHIK_NATIVE_ADAPTER_KEY,
      provider: "shothik",
      managed: true,
      native: true,
      packageReady: false,
      categories: ["writing", "analysis", "language"],
      ...(appOrigin ? { appOrigin: appOrigin.replace(/\/+$/, "") } : {}),
    },
    lastDiscoveredAt: timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}
