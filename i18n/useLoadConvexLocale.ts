"use client";

import { useEffect, useRef } from "react";
import { useTranslation } from "./index";
import type { Locale } from "./index";
import { getPreferences } from "@/lib/user-preferences";

function isValidLocale(value: unknown): value is Locale {
  return value === "en" || value === "bn";
}

export function useLoadConvexLocale(userId: string | null | undefined) {
  const { setLocale } = useTranslation();
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (hasLoadedRef.current || !userId) return;

    const prefs = getPreferences();
    if (isValidLocale(prefs.locale)) {
      hasLoadedRef.current = true;
      setLocale(prefs.locale);
    }
  }, [userId, setLocale]);
}
