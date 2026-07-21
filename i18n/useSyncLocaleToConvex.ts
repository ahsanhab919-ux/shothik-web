"use client";

import { useCallback, useRef } from "react";
import { setPreferences } from "@/lib/user-preferences";

export function useSyncLocaleToConvex() {
  const lastSyncedRef = useRef<string | null>(null);

  return useCallback(
    (userId: string, locale: string) => {
      if (lastSyncedRef.current === `${userId}:${locale}`) {
        return;
      }
      lastSyncedRef.current = `${userId}:${locale}`;
      setPreferences({ locale: locale as "en" | "bn" });
    },
    []
  );
}
