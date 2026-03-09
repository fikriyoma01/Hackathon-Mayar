"use client";

import { PlugZap, Webhook } from "lucide-react";
import { useEffect, useState } from "react";

type MayarState = {
  apiConfigured: boolean;
  webhookUrl: string;
  webhookSecretConfigured: boolean;
  webhookTokenConfigured: boolean;
  verificationMode: string;
  isWebhookPublic: boolean;
  deploymentReady: boolean;
  mcpTransport: string;
  mcpServerUrl: string;
  mcpHeaderName: string;
  mcpConfigPath: string;
  mcpNeedsReload: boolean;
  webhookRegistrationNote: string;
};

export function MayarConnectionCard() {
  const [state, setState] = useState<MayarState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/mayar/configure")
      .then((response) => response.json())
      .then((data) => setState(data))
      .catch(() => setError("Status Mayar tidak bisa dimuat."));
  }, []);

  return (
    <div className="surface-card rounded-[28px] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-[var(--ink-soft)]">Koneksi Mayar</p>
          <p className="mt-2 display-font text-2xl font-bold text-[var(--foreground)]">
            {state?.apiConfigured ? "Terhubung" : "Belum terhubung"}
          </p>
        </div>
        <div className="rounded-2xl bg-amber-100 p-3 text-amber-700">
          <PlugZap className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-4 rounded-[22px] bg-[rgba(19,35,29,0.04)] p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--ink-soft)]">
          Alamat konfirmasi pembayaran
        </p>
        <p className="mt-2 break-all text-sm font-semibold text-[var(--foreground)]">
          {state?.webhookUrl ?? "Memuat..."}
        </p>
        <p className="mt-2 text-xs text-[var(--ink-soft)]">
          {state?.isWebhookPublic
            ? "Alamat ini sudah publik dan siap dipakai saat integrasi langsung diaktifkan."
            : "Alamat ini belum publik, sehingga konfirmasi otomatis dari Mayar belum bisa menjangkau aplikasi."}
        </p>
        <p className="mt-2 text-xs text-[var(--ink-soft)]">
          Kunci verifikasi internal: {state?.webhookSecretConfigured ? "aktif" : "belum diatur"}
        </p>
        <p className="mt-2 text-xs text-[var(--ink-soft)]">
          Token Mayar: {state?.webhookTokenConfigured ? "aktif" : "belum diatur"}
        </p>
        <p className="mt-2 text-xs text-[var(--ink-soft)]">
          Mode verifikasi: {state?.verificationMode ?? "memuat"}.
        </p>
      </div>

      <div className="mt-4 rounded-[22px] bg-[rgba(19,35,29,0.04)] p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--ink-soft)]">
          Koneksi internal
        </p>
        <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">
          {`${state?.mcpTransport ?? "Memuat..."} | ${state?.mcpServerUrl ?? "-"}`}
        </p>
        <p className="mt-2 text-xs text-[var(--ink-soft)]">
          Header autentikasi: {state?.mcpHeaderName ?? "Authorization"} dari konfigurasi sistem.
        </p>
      </div>

      <div className="mt-4 rounded-[22px] border border-[var(--line)] bg-white/80 p-4">
        <div className="flex items-start gap-3">
          <Webhook className="mt-0.5 h-5 w-5 text-[var(--brand)]" />
          <div>
            <p className="font-semibold text-[var(--foreground)]">Status konfigurasi</p>
            <p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">
              {state?.webhookRegistrationNote ?? "Menunggu status konfigurasi Mayar."}
            </p>
            <p className="mt-2 text-xs text-[var(--ink-soft)]">
              Konfigurasi internal tersimpan di {state?.mcpConfigPath ?? "config aplikasi"}.
              {state?.mcpNeedsReload
                ? " Muat ulang aplikasi pengelola agar pembaruan koneksi terbaca."
                : ""}
            </p>
            <p className="mt-2 text-xs font-semibold text-[var(--foreground)]">
              {state?.deploymentReady
                ? "Siap dipakai langsung: API, alamat publik, dan verifikasi pembayaran sudah lengkap."
                : "Belum siap dipakai langsung: lengkapi alamat publik dan verifikasi pembayaran otomatis."}
            </p>
          </div>
        </div>
      </div>

      {error ? (
        <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
