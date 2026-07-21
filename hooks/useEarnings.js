"use client";

import { useCallback, useEffect, useState } from "react";

const EMPTY_SUMMARY = {
  totalEarnings: 0,
  totalUnitsSold: 0,
  lifetimeRevenue: 0,
  availableBalance: 0,
  totalPaidOut: 0,
  pendingPayouts: 0,
  publishedBooksCount: 0,
  monthlyBreakdown: [],
  perBookEarnings: [],
};

export function useEarnings(userId) {
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [isLoading, setIsLoading] = useState(Boolean(userId));

  const loadSummary = useCallback(async () => {
    if (!userId) {
      setSummary(EMPTY_SUMMARY);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/publish/earnings", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to load earnings summary");
      }

      const data = await response.json();
      setSummary(data.summary || EMPTY_SUMMARY);
    } catch {
      setSummary(EMPTY_SUMMARY);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  return {
    summary,
    isLoading,
    refreshSummary: loadSummary,
  };
}

export function usePayouts(userId) {
  const [history, setHistory] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(Boolean(userId));
  const [isRequesting, setIsRequesting] = useState(false);
  const [error, setError] = useState(null);

  const loadPayoutData = useCallback(async () => {
    if (!userId) {
      setHistory([]);
      setAccounts([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/publish/payouts", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to load payout data");
      }

      const data = await response.json();
      setHistory(Array.isArray(data.history) ? data.history : []);
      setAccounts(Array.isArray(data.accounts) ? data.accounts : []);
      setError(null);
    } catch (err) {
      setHistory([]);
      setAccounts([]);
      setError(err instanceof Error ? err.message : "Failed to load payout data");
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void loadPayoutData();
  }, [loadPayoutData]);

  const requestPayout = useCallback(
    async ({ amount, method, periodStart, periodEnd }) => {
      setIsRequesting(true);
      setError(null);
      try {
        const response = await fetch("/api/publish/payouts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            amount,
            method,
            periodStart,
            periodEnd,
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || data.error || "Failed to request payout");
        }

        await loadPayoutData();
        return data.payout?._id;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to request payout");
        throw err;
      } finally {
        setIsRequesting(false);
      }
    },
    [loadPayoutData]
  );

  const savePayoutAccount = useCallback(
    async (accountData) => {
      setError(null);
      try {
        const response = await fetch("/api/publish/payout-accounts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(accountData),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || data.error || "Failed to save payout account");
        }

        await loadPayoutData();
        return data.payoutAccount;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save payout account");
        throw err;
      }
    },
    [loadPayoutData]
  );

  return {
    history,
    accounts,
    isLoading,
    isRequesting,
    error,
    requestPayout,
    savePayoutAccount,
    refreshPayoutData: loadPayoutData,
  };
}
