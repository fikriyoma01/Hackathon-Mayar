"use client";

import { ArrowRight, CreditCard, HeartHandshake, Phone } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { formatCurrency } from "@/lib/format";

export interface SponsorPortionOption {
  id: string;
  title: string;
  area: string;
  sponsorPrice: number;
  availablePortions: number;
}

export function SponsorForm({
  portions,
}: {
  portions: SponsorPortionOption[];
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    portionId: portions[0]?.id ?? "",
    donorName: "Donatur Ramadan",
    donorEmail: "donatur@contoh.id",
    donorPhone: "081234567890",
    sponsoredPortions: 5,
  });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selected = portions.find((item) => item.id === form.portionId);
  const total = selected ? selected.sponsorPrice * form.sponsoredPortions : 0;

  return (
    <section className="surface-card-strong rounded-[32px] p-6 lg:p-7">
      <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-800">
        <HeartHandshake className="h-4 w-4" />
        Pembayaran aman via Mayar.id
      </div>
      <h2 className="display-font mt-5 text-3xl font-black tracking-tight text-[var(--foreground)]">
        Pilih paket yang ingin Anda bantu.
      </h2>
      <p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">
        Tentukan paket makanan, isi data singkat, lalu lanjutkan ke pembayaran.
        Setelah pembayaran diterima, bantuan akan langsung tercatat.
      </p>

      <form
        className="mt-6 space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          startTransition(async () => {
            setError(null);
            const response = await fetch("/api/transactions", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(form),
            });
            const data = (await response.json()) as {
              error?: string;
              transactionId?: string;
            };

            if (!response.ok || !data.transactionId) {
              setError(data.error ?? "Gagal menyiapkan pembayaran.");
              return;
            }

            router.push(`/checkout/${data.transactionId}`);
          });
        }}
      >
        <label className="block">
          <span className="mb-2 block text-sm font-semibold">Pilih paket makanan</span>
          <select
            className="w-full rounded-[22px] border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none"
            value={form.portionId}
            onChange={(event) =>
              setForm((current) => ({ ...current, portionId: event.target.value }))
            }
          >
            {portions.map((portion) => (
              <option key={portion.id} value={portion.id}>
                {`${portion.title} | ${portion.area} | sisa ${portion.availablePortions}`}
              </option>
            ))}
          </select>
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold">Nama donatur</span>
            <input
              className="w-full rounded-[22px] border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none"
              value={form.donorName}
              onChange={(event) =>
                setForm((current) => ({ ...current, donorName: event.target.value }))
              }
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold">Email</span>
            <input
              type="email"
              className="w-full rounded-[22px] border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none"
              value={form.donorEmail}
              onChange={(event) =>
                setForm((current) => ({ ...current, donorEmail: event.target.value }))
              }
            />
          </label>
        </div>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold">Nomor WhatsApp</span>
          <div className="flex items-center gap-3 rounded-[22px] border border-[var(--line)] bg-white px-4 py-3">
            <Phone className="h-4 w-4 text-[var(--ink-soft)]" />
            <input
              className="w-full bg-transparent text-sm outline-none"
              value={form.donorPhone}
              onChange={(event) =>
                setForm((current) => ({ ...current, donorPhone: event.target.value }))
              }
            />
          </div>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold">Jumlah porsi</span>
          <input
            type="number"
            min={1}
            max={selected?.availablePortions ?? 1}
            className="w-full rounded-[22px] border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none"
            value={form.sponsoredPortions}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                sponsoredPortions: Number(event.target.value),
              }))
            }
          />
        </label>

        <div className="rounded-[24px] border border-[var(--line)] bg-white/80 p-4">
          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="text-[var(--ink-soft)]">Estimasi pembayaran</span>
            <span className="text-lg font-bold text-[var(--foreground)]">
              {formatCurrency(total)}
            </span>
          </div>
          <p className="mt-2 flex items-center gap-2 text-xs text-[var(--ink-soft)]">
            <CreditCard className="h-4 w-4" />
            Pembayaran bisa melalui QRIS atau tautan pembayaran. Statusnya akan diperbarui otomatis.
          </p>
        </div>

        {error ? (
          <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isPending || !selected}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--brand)] px-6 py-3 text-sm font-semibold text-white hover:-translate-y-0.5 hover:bg-[var(--brand-strong)]"
        >
          {isPending ? "Menyiapkan pembayaran..." : "Lanjut ke pembayaran"}
          <ArrowRight className="h-4 w-4" />
        </button>
      </form>
    </section>
  );
}
