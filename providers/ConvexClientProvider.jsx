"use client";

import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "./AuthProvider";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
const convexClient = convexUrl ? new ConvexReactClient(convexUrl) : null;

function useConvexSessionAuth() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [convexToken, setConvexToken] = useState(null);
  const [isTokenLoading, setIsTokenLoading] = useState(false);
  const tokenCacheKeyRef = useRef(null);
  const inFlightTokenRef = useRef(null);

  const refreshConvexToken = useCallback(async () => {
    if (!isAuthenticated || !user?.id) {
      setConvexToken(null);
      tokenCacheKeyRef.current = null;
      return null;
    }

    if (inFlightTokenRef.current) {
      return inFlightTokenRef.current;
    }

    const request = (async () => {
      setIsTokenLoading(true);
      try {
        const response = await fetch("/api/auth/convex-token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          setConvexToken(null);
          tokenCacheKeyRef.current = null;
          return null;
        }

        const payload = await response.json();
        const token = typeof payload?.token === "string" ? payload.token : null;
        setConvexToken(token);
        tokenCacheKeyRef.current = token ? user.id : null;
        return token;
      } finally {
        setIsTokenLoading(false);
        inFlightTokenRef.current = null;
      }
    })();

    inFlightTokenRef.current = request;
    return request;
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setConvexToken(null);
      tokenCacheKeyRef.current = null;
      return;
    }

    if (tokenCacheKeyRef.current !== user.id) {
      void refreshConvexToken();
    }
  }, [isAuthenticated, refreshConvexToken, user?.id]);

  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken } = {}) => {
      if (!isAuthenticated || !user?.id) {
        return null;
      }

      if (forceRefreshToken || !convexToken || tokenCacheKeyRef.current !== user.id) {
        return await refreshConvexToken();
      }

      return convexToken;
    },
    [convexToken, isAuthenticated, refreshConvexToken, user?.id],
  );

  return useMemo(
    () => ({
      isLoading: isLoading || (isAuthenticated && isTokenLoading && !convexToken),
      isAuthenticated,
      fetchAccessToken,
    }),
    [convexToken, fetchAccessToken, isAuthenticated, isLoading, isTokenLoading],
  );
}

export default function ConvexClientProvider({ children }) {
  if (!convexClient) {
    return <>{children}</>;
  }

  return (
    <ConvexProviderWithAuth client={convexClient} useAuth={useConvexSessionAuth}>
      {children}
    </ConvexProviderWithAuth>
  );
}
