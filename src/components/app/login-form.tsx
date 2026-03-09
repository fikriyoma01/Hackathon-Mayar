"use client";

import { ArrowRight, KeyRound, Mail, Sparkles } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

const demoAccounts = [
  {
    label: "Pengelola pusat",
    email: "admin@iftarrelay.id",
    password: "ramadan123",
    note: "Lihat seluruh data, pembayaran, laporan, dan pengaturan.",
  },
  {
    label: "Merchant",
    email: "merchant@iftarrelay.id",
    password: "ramadan123",
    note: "Kelola paket makanan, status bantuan, dan aktivitas merchant.",
  },
  {
    label: "Petugas lapangan",
    email: "operator@iftarrelay.id",
    password: "ramadan123",
    note: "Buka tampilan seluler untuk memeriksa voucher dan unggah dokumentasi.",
  },
];

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [form, setForm] = useState({
    email: "admin@iftarrelay.id",
    password: "ramadan123",
  });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="surface-card-strong rounded-[36px] p-8 lg:p-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
          <Sparkles className="h-4 w-4" />
          Akses pengelola
        </div>
        <h1 className="display-font mt-6 text-4xl font-black tracking-tight text-[var(--foreground)]">
          Masuk untuk mengelola merchant, bantuan, dan penyaluran.
        </h1>
        <p className="mt-4 max-w-xl text-base leading-7 text-[var(--ink-soft)]">
          Gunakan akun yang tersedia di samping atau isi manual. Setelah masuk,
          Anda bisa membuka dashboard web dan tampilan seluler dengan data yang sama.
        </p>

        <form
          className="mt-8 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            startTransition(async () => {
              setError(null);
              const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  ...form,
                  next: searchParams.get("next"),
                }),
              });
              const data = (await response.json()) as {
                error?: string;
                redirectTo?: string;
              };

              if (!response.ok) {
                setError(data.error ?? "Gagal login.");
                return;
              }

              router.push(data.redirectTo ?? "/dashboard");
              router.refresh();
            });
          }}
        >
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[var(--foreground)]">
              Email
            </span>
            <div className="flex items-center gap-3 rounded-[24px] border border-[var(--line)] bg-white px-4 py-3">
              <Mail className="h-4 w-4 text-[var(--ink-soft)]" />
              <input
                type="email"
                className="w-full bg-transparent text-sm outline-none"
                value={form.email}
                onChange={(event) =>
                  setForm((current) => ({ ...current, email: event.target.value }))
                }
                placeholder="admin@iftarrelay.id"
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[var(--foreground)]">
              Password
            </span>
            <div className="flex items-center gap-3 rounded-[24px] border border-[var(--line)] bg-white px-4 py-3">
              <KeyRound className="h-4 w-4 text-[var(--ink-soft)]" />
              <input
                type="password"
                className="w-full bg-transparent text-sm outline-none"
                value={form.password}
                onChange={(event) =>
                  setForm((current) => ({ ...current, password: event.target.value }))
                }
                placeholder="ramadan123"
              />
            </div>
          </label>

          {error ? (
            <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--brand)] px-6 py-3 text-sm font-semibold text-white hover:-translate-y-0.5 hover:bg-[var(--brand-strong)]"
            disabled={isPending}
          >
            {isPending ? "Memverifikasi..." : "Masuk"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      </section>

      <section className="surface-card rounded-[36px] p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--ink-soft)]">
          Pilihan akses
        </p>
        <div className="mt-5 space-y-4">
          {demoAccounts.map((account) => (
            <button
              key={account.label}
              type="button"
              className="w-full rounded-[28px] border border-[var(--line)] bg-[rgba(255,255,255,0.74)] p-5 text-left hover:-translate-y-0.5 hover:border-emerald-200"
              onClick={() =>
                setForm({
                  email: account.email,
                  password: account.password,
                })
              }
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="display-font text-xl font-bold text-[var(--foreground)]">
                    {account.label}
                  </p>
                  <p className="mt-1 text-sm text-[var(--ink-soft)]">
                    {account.email}
                  </p>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  ramadan123
                </span>
              </div>
              <p className="mt-4 text-sm leading-6 text-[var(--ink-soft)]">
                {account.note}
              </p>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
