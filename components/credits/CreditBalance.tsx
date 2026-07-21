"use client";

import { useEffect, useState } from "react";
import { Coins } from "lucide-react";
import { cn } from "@/lib/utils";

interface CreditBalanceProps {
  onClick?: () => void;
  className?: string;
  size?: "sm" | "md";
}

export default function CreditBalance({ onClick, className, size = "md" }: CreditBalanceProps) {
  const [balanceData, setBalanceData] = useState<{ balance: number } | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/credits/balance")
      .then(async (response) => {
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(payload?.message || "Failed to load balance");
        }
        return payload;
      })
      .then((data) => {
        if (!cancelled) {
          setBalanceData(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setBalanceData({ balance: 0 });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);
  const balance = balanceData?.balance ?? 0;

  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-amber-950/30 px-3 py-1.5 font-semibold text-amber-400 transition-colors hover:bg-amber-950/50",
        size === "sm" && "gap-1 px-2 py-1 text-xs",
        size === "md" && "text-sm",
        className
      )}
      aria-label={`Credit balance: ${balance} credits. Click to purchase more.`}
    >
      <Coins className={cn("fill-amber-400", size === "sm" ? "h-3 w-3" : "h-4 w-4")} />
      <span className="tabular-nums">{balance.toLocaleString()}</span>
    </button>
  );
}
