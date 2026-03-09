"use client";

import { PencilLine } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type { Merchant } from "@/lib/types";

const merchantImageOptions = [
  "/images/merchant.png",
  "/images/food-package.png",
  "/images/charity-box.png",
];

export function MerchantProfileEditor({ merchant }: { merchant: Merchant }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    name: merchant.name,
    ownerName: merchant.ownerName,
    area: merchant.area,
    phone: merchant.phone,
    etaMinutes: merchant.etaMinutes,
    specialty: merchant.specialty,
    imageUrl: merchant.imageUrl ?? merchantImageOptions[0],
  });

  return (
    <div className="space-y-3">
      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold text-[var(--foreground)]"
        onClick={() => setOpen((current) => !current)}
      >
        <PencilLine className="h-4 w-4" />
        {open ? "Tutup edit" : "Edit profil"}
      </button>

      {open ? (
        <div className="space-y-3 rounded-[24px] border border-[var(--line)] bg-[rgba(19,35,29,0.03)] p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <input
              className="rounded-[18px] border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none"
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
            />
            <input
              className="rounded-[18px] border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none"
              value={form.ownerName}
              onChange={(event) =>
                setForm((current) => ({ ...current, ownerName: event.target.value }))
              }
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <input
              className="rounded-[18px] border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none"
              value={form.area}
              onChange={(event) =>
                setForm((current) => ({ ...current, area: event.target.value }))
              }
            />
            <input
              className="rounded-[18px] border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none"
              value={form.phone}
              onChange={(event) =>
                setForm((current) => ({ ...current, phone: event.target.value }))
              }
            />
          </div>
          <div className="grid gap-3 md:grid-cols-[1fr_160px]">
            <input
              className="rounded-[18px] border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none"
              value={form.specialty}
              onChange={(event) =>
                setForm((current) => ({ ...current, specialty: event.target.value }))
              }
            />
            <input
              type="number"
              className="rounded-[18px] border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none"
              value={form.etaMinutes}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  etaMinutes: Number(event.target.value),
                }))
              }
            />
          </div>
          <select
            className="w-full rounded-[18px] border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none"
            value={form.imageUrl}
            onChange={(event) =>
              setForm((current) => ({ ...current, imageUrl: event.target.value }))
            }
          >
            {merchantImageOptions.map((imageUrl) => (
              <option key={imageUrl} value={imageUrl}>
                {imageUrl.split("/").pop()}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={isPending}
            className="rounded-full bg-[var(--foreground)] px-4 py-3 text-sm font-semibold text-white"
            onClick={() => {
              startTransition(async () => {
                setError(null);
                const response = await fetch(`/api/merchants/${merchant.id}`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify(form),
                });
                const data = (await response.json()) as { error?: string };

                if (!response.ok) {
                  setError(data.error ?? "Gagal memperbarui merchant.");
                  return;
                }

                setOpen(false);
                router.refresh();
              });
            }}
          >
            {isPending ? "Menyimpan..." : "Simpan profil merchant"}
          </button>
          {error ? <p className="text-sm text-rose-700">{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
