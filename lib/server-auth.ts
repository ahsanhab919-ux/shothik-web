import { createInsforgeServerClient } from "@/lib/insforge/server";
import {
  type AuthenticatedUser,
  normalizeInsforgeUser,
} from "@/lib/insforge/user";

export type User = AuthenticatedUser;

export async function getAuthenticatedUser(): Promise<User | null> {
  return getInsforgeAuthenticatedUser();
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
