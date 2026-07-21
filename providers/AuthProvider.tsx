"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { getInsforgeBrowserClient } from "@/lib/insforge/client";
import {
  type AuthenticatedUser,
  normalizeInsforgeUser,
} from "@/lib/insforge/user";

const GOOGLE_OAUTH_CODE_VERIFIER_KEY = "shothik.oauth.google.codeVerifier";

interface AuthContextProps {
  user: AuthenticatedUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (
    name: string,
    email: string,
    password: string,
    country: string,
  ) => Promise<{ requiresEmailVerification: boolean }>;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;

    async function hydrateAuth() {
      if (typeof window === "undefined") {
        setIsLoading(false);
        return;
      }

      try {
        const insforge = getInsforgeBrowserClient();
        const currentUrl = new URL(window.location.href);
        const oauthCode = currentUrl.searchParams.get("insforge_code");
        let exchangedUser: AuthenticatedUser | null = null;

        if (oauthCode) {
          const codeVerifier =
            window.sessionStorage.getItem(GOOGLE_OAUTH_CODE_VERIFIER_KEY) ?? "";
          const exchangeResponse = await fetch("/api/auth/oauth/exchange", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(
              codeVerifier
                ? { code: oauthCode, codeVerifier }
                : { code: oauthCode },
            ),
          });
          const exchangePayload = (await exchangeResponse.json().catch(() => null)) as {
            user?: AuthenticatedUser | null;
            message?: string;
            error?: string;
          } | null;

          if (!exchangeResponse.ok) {
            console.error(
              "OAuth code exchange failed:",
              exchangePayload?.message || exchangePayload?.error || "Unknown error",
            );
          } else {
            exchangedUser = exchangePayload?.user ?? null;
            window.sessionStorage.removeItem(GOOGLE_OAUTH_CODE_VERIFIER_KEY);
            currentUrl.searchParams.delete("insforge_code");
            window.history.replaceState({}, "", currentUrl.toString());
          }
        }

        const { data, error } = await insforge.auth.getCurrentUser();
        const insforgeUser = !error ? normalizeInsforgeUser(data?.user ?? null) : null;
        const hydratedUser = insforgeUser ?? exchangedUser;

        if (!cancelled && hydratedUser) {
          localStorage.removeItem("jwt_token");
          setUser(hydratedUser);
          setIsAuthenticated(true);
          setIsLoading(false);
          return;
        }
      } catch (error) {
        localStorage.removeItem("jwt_token");
      }

      if (!cancelled) {
        setUser(null);
        setIsAuthenticated(false);
        setIsLoading(false);
      }
    }

    void hydrateAuth();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    try {
      const response = await fetch("/api/auth/sign-in", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });
      const payload = await response.json();

      if (!response.ok || !payload?.user) {
        throw new Error(payload?.message || "Unable to sign in.");
      }

      localStorage.removeItem("jwt_token");
      setUser(payload.user);
      setIsAuthenticated(true);
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  };

  const logout = (): void => {
    void fetch("/api/auth/sign-out", { method: "POST" }).catch(() => undefined);
    localStorage.removeItem("jwt_token");
    setUser(null);
    setIsAuthenticated(false);
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    country: string,
  ): Promise<{ requiresEmailVerification: boolean }> => {
    try {
      const response = await fetch("/api/auth/sign-up", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
          country,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.message || "Unable to create account.");
      }

      return {
        requiresEmailVerification: Boolean(payload?.requiresEmailVerification),
      };
    } catch (error) {
      console.error("Registration failed:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, isLoading, isAuthenticated, login, logout, register }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextProps => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
