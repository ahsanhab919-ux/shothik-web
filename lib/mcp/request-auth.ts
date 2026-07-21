import { NextRequest } from 'next/server';

import { authenticateTwinRequest, requireAnyAuth } from '@/lib/twin-api-auth';

export interface MCPRequestAuthResult {
  authenticated: boolean;
  tenantId?: string;
  userId?: string;
  origin?: 'mcp_host';
  authType: 'user_session' | 'twin_key' | 'none';
  error?: string;
  twinId?: string;
}

export async function authenticateMcpRequest(
  request: NextRequest,
): Promise<MCPRequestAuthResult> {
  const auth = await authenticateTwinRequest(request);

  if (!requireAnyAuth(auth)) {
    return {
      authenticated: false,
      authType: auth.authType,
      error: auth.error ?? 'Authentication required',
    };
  }

  return {
    authenticated: true,
    tenantId: String(auth.userId),
    userId: String(auth.userId),
    origin: 'mcp_host',
    authType: auth.authType,
    twinId: auth.twinId ? String(auth.twinId) : undefined,
  };
}

