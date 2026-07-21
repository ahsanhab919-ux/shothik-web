import { type NextRequest } from "next/server";
import { createServerClient } from "@insforge/sdk/ssr";
import { getInsforgePublicConfig } from "@/lib/insforge/config";
import { normalizeInsforgeUser } from "@/lib/insforge/user";

export function createInsforgeRequestClient(request: NextRequest) {
  return createServerClient({
    cookies: request.cookies,
    ...getInsforgePublicConfig(),
  });
}

export async function getAuthenticatedRequestUser(request: NextRequest) {
  const insforge = createInsforgeRequestClient(request);
  const { data, error } = await insforge.auth.getCurrentUser();

  if (error || !data?.user) {
    return null;
  }

  return normalizeInsforgeUser(data.user);
}
