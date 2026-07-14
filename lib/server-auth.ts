import { cookies } from 'next/headers';
import AuthService from '@/services/auth.service';
import { createInsforgeServerClient } from "@/lib/insforge/server";
import {
  type AuthenticatedUser,
  normalizeInsforgeUser,
  normalizeLegacyUser,
} from "@/lib/insforge/user";

export type User = AuthenticatedUser;

export async function getAuthenticatedUser(): Promise<User | null> {
  const insforgeUser = await getInsforgeAuthenticatedUser();
  if (insforgeUser) {
    return insforgeUser;
  }

  return getLegacyAuthenticatedUser();
}

export async function getChatAuthenticatedUser(): Promise<User | null> {
  return getInsforgeAuthenticatedUser();
}

async function getInsforgeAuthenticatedUser(): Promise<User | null> {
  try {
    const insforge = await createInsforgeServerClient();
    const { data, error } = await insforge.auth.getCurrentUser();

    if (error || !data?.user) {
      return null;
    }

    return normalizeInsforgeUser(data.user);
  } catch (error) {
    return null;
  }
}

async function getLegacyAuthenticatedUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('jwt_token')?.value;

  if (!token) {
    return null;
  }

  try {
    const authService = new AuthService();
    const response = await authService.getUser(token);

    if (response.data && response.data.data) {
      return normalizeLegacyUser(response.data.data);
    }
    return null;
  } catch (error) {
    console.error("Auth error:", error);
    return null;
  }
}
