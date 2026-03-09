"use client";

import { PencilLine } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type { DistributionNode } from "@/lib/types";

const nodeImageOptions = [
  "/images/mosque.png",
  "/images/charity-box.png",
  "/images/delivery-map.png",
];

export function NodeProfileEditor({ node }: { node: DistributionNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    name: node.name,
    type: node.type,
    area: node.area,
    contactName: node.contactName,
    contactPhone: node.contactPhone,
    imageUrl: node.imageUrl ?? nodeImageOptions[0],
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
            <select
              className="rounded-[18px] border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none"
              value={form.type}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  type: event.target.value as "masjid" | "komunitas",
                }))
              }
            >
              <option value="masjid">Masjid</option>
              <option value="komunitas">Komunitas</option>
            </select>
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
              value={form.contactName}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  contactName: event.target.value,
                }))
              }
            />
          </div>
          <input
            className="w-full rounded-[18px] border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none"
            value={form.contactPhone}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                contactPhone: event.target.value,
              }))
            }
          />
          <select
            className="w-full rounded-[18px] border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none"
            value={form.imageUrl}
            onChange={(event) =>
              setForm((current) => ({ ...current, imageUrl: event.target.value }))
            }
          >
            {nodeImageOptions.map((imageUrl) => (
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
                const response = await fetch(`/api/nodes/${node.id}`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify(form),
                });
                const data = (await response.json()) as { error?: string };

                if (!response.ok) {
                  setError(data.error ?? "Gagal memperbarui lokasi penyaluran.");
                  return;
                }

                setOpen(false);
                router.refresh();
              });
            }}
          >
            {isPending ? "Menyimpan..." : "Simpan profil lokasi"}
          </button>
          {error ? <p className="text-sm text-rose-700">{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
