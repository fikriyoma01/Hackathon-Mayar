"use client";

import {
  CheckCircle2,
  Clock3,
  ExternalLink,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useState, useTransition } from "react";

import { formatDateTime } from "@/lib/format";
import type { TransactionStatus } from "@/lib/types";

type IntegrationMode = "direct" | "mock";

export function MayarPaymentControls({
  transactionId,
  status,
  voucherCode,
  integrationMode,
  paymentUrl,
}: {
  transactionId: string;
  status: TransactionStatus;
  voucherCode?: string;
  integrationMode: IntegrationMode;
  paymentUrl: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function syncStatus(silent = false) {
    const response = await fetch(`/api/transactions/${transactionId}/sync`, {
      method: "POST",
    });
    const data = (await response.json()) as { error?: string; status?: TransactionStatus };

    if (!response.ok) {
      if (!silent) {
        setError(data.error ?? "Status pembayaran belum bisa diperbarui.");
      }
      return;
    }

    setError(null);
    setLastCheckedAt(new Date().toISOString());

    if (data.status && data.status !== status) {
      router.refresh();
    }
  }

  const syncStatusFromEffect = useEffectEvent(async () => {
    await syncStatus(true);
  });

  useEffect(() => {
    if (integrationMode !== "direct" || status !== "pending") {
      return;
    }

    const runSilentSync = () => {
      startTransition(async () => {
        await syncStatusFromEffect();
      });
    };

    runSilentSync();

    const intervalId = window.setInterval(runSilentSync, 15000);
    const handleFocus = () => runSilentSync();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        runSilentSync();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [integrationMode, status, transactionId]);

  if (status === "paid") {
    return (
      <div className="space-y-3">
        <p className="rounded-[24px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Pembayaran berhasil diterima dan voucher penyaluran sudah aktif.
        </p>
        {voucherCode ? (
          <button
            type="button"
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--brand)] px-5 py-3 text-sm font-semibold text-white"
            onClick={() => router.push(`/voucher/${voucherCode}`)}
          >
            <ShieldCheck className="h-4 w-4" />
            Buka voucher digital
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {integrationMode === "direct" ? (
        <div className="rounded-[24px] border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
          <p className="font-semibold">Pengecekan pembayaran aktif</p>
          <p className="mt-1 leading-6">
            Status pembayaran dicek otomatis setiap 15 detik dan saat halaman dibuka kembali.
          </p>
          <p className="mt-2 inline-flex items-center gap-2 text-xs text-sky-700">
            <Clock3 className="h-3.5 w-3.5" />
            {lastCheckedAt
              ? `Terakhir dicek ${formatDateTime(lastCheckedAt)}`
              : "Menunggu pengecekan pertama"}
          </p>
        </div>
      ) : (
        <div className="rounded-[24px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p className="font-semibold">Mode simulasi aktif</p>
          <p className="mt-1 leading-6">
            Halaman ini belum tersambung ke pembayaran langsung, jadi status pembayaran ditandai secara lokal.
          </p>
        </div>
      )}

      {error ? (
        <p className="rounded-[24px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      {integrationMode === "direct" ? (
        <>
          <a
            href={paymentUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--brand)] px-5 py-3 text-sm font-semibold text-white"
          >
            <ExternalLink className="h-4 w-4" />
            Buka halaman pembayaran
          </a>
          <button
            type="button"
            disabled={isPending}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-[var(--line)] bg-white px-5 py-3 text-sm font-semibold text-[var(--foreground)]"
            onClick={() => {
              startTransition(async () => {
                await syncStatus();
              });
            }}
          >
            <RefreshCw className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
            {isPending ? "Memperbarui..." : "Perbarui status"}
          </button>
        </>
      ) : (
        <button
          type="button"
          disabled={isPending}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--brand)] px-5 py-3 text-sm font-semibold text-white"
          onClick={() => {
            startTransition(async () => {
              setError(null);
              const response = await fetch(`/api/transactions/${transactionId}/pay`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ paymentMethod: "QRIS Mayar" }),
              });
              const data = (await response.json()) as { error?: string };

              if (!response.ok) {
                setError(data.error ?? "Pembayaran simulasi gagal.");
                return;
              }

              router.refresh();
            });
          }}
        >
          <CheckCircle2 className="h-4 w-4" />
          {isPending ? "Memproses..." : "Tandai pembayaran berhasil"}
        </button>
      )}
    </div>
  );
}
