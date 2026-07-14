"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import AuthService from "@/services/auth.service";
import { getInsforgeBrowserClient } from "@/lib/insforge/client";
import {
  type AuthenticatedUser,
  normalizeInsforgeUser,
  normalizeLegacyUser,
} from "@/lib/insforge/user";

interface AuthContextProps {
  user: AuthenticatedUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (name: string, email: string, password: string, country: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

const authService = new AuthService();

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
        const { data, error } = await insforge.auth.getCurrentUser();
        const insforgeUser = !error ? normalizeInsforgeUser(data?.user ?? null) : null;

        if (!cancelled && insforgeUser) {
          localStorage.removeItem("jwt_token");
          setUser(insforgeUser);
          setIsAuthenticated(true);
          setIsLoading(false);
          return;
        }
      } catch (error) {
        // Fall back to the legacy bridge while the rest of auth is still migrating.
      }

      const token = localStorage.getItem("jwt_token");
      if (!token) {
        if (!cancelled) {
          setUser(null);
          setIsAuthenticated(false);
          setIsLoading(false);
        }
        return;
      }

      try {
        const userData = await authService.validateToken(token);
        const legacyUser = normalizeLegacyUser(userData);

        if (!cancelled && legacyUser) {
          setUser(legacyUser);
          setIsAuthenticated(true);
          return;
        }

        throw new Error("Invalid token");
      } catch (error) {
        localStorage.removeItem("jwt_token");
        if (!cancelled) {
          setUser(null);
          setIsAuthenticated(false);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
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
  ): Promise<void> => {
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
