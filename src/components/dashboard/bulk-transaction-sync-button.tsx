"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function BulkTransactionSyncButton() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        disabled={isPending}
        className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold text-[var(--foreground)]"
        onClick={() => {
          startTransition(async () => {
            setError(null);
            setMessage(null);

            const response = await fetch("/api/transactions/sync-all", {
              method: "POST",
            });
            const data = (await response.json()) as {
              error?: string;
              checkedCount?: number;
              paidCount?: number;
            };

            if (!response.ok) {
              setError(data.error ?? "Pembaruan pembayaran massal gagal.");
              return;
            }

            setMessage(
              `${data.checkedCount ?? 0} pembayaran dicek, ${data.paidCount ?? 0} berubah menjadi lunas.`,
            );
            router.refresh();
          });
        }}
      >
        <RefreshCw className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
        {isPending ? "Memperbarui..." : "Perbarui semua yang menunggu"}
      </button>
      {message ? (
        <p className="text-xs text-emerald-700">{message}</p>
      ) : error ? (
        <p className="text-xs text-rose-700">{error}</p>
      ) : null}
    </div>
  );
}
