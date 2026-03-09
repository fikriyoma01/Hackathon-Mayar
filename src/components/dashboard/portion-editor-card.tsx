"use client";

import { PencilLine, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type { DistributionNode, Portion } from "@/lib/types";

export function PortionEditorCard({
  portion,
  nodes,
}: {
  portion: Portion;
  nodes: DistributionNode[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    title: portion.title,
    description: portion.description,
    pickupStartAt: portion.pickupStartAt.slice(0, 16),
    pickupEndAt: portion.pickupEndAt.slice(0, 16),
    assignedNodeId: portion.assignedNodeId,
    tags: portion.tags.join(", "),
    imageUrl: portion.imageUrl ?? "/images/food-package.png",
  });

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold text-[var(--foreground)]"
          onClick={() => setOpen((current) => !current)}
        >
          <PencilLine className="h-4 w-4" />
          {open ? "Tutup edit" : "Edit paket"}
        </button>
        <button
          type="button"
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700"
          onClick={() => {
            if (!window.confirm("Hapus paket ini dari daftar? Aksi ini tidak bisa dibatalkan.")) {
              return;
            }

            startTransition(async () => {
              setError(null);
              const response = await fetch(`/api/portions/${portion.id}`, {
                method: "DELETE",
              });
              const data = (await response.json()) as { error?: string };

              if (!response.ok) {
                setError(data.error ?? "Gagal menghapus paket.");
                return;
              }

              router.refresh();
            });
          }}
        >
          <Trash2 className="h-4 w-4" />
          Hapus
        </button>
      </div>

      {open ? (
        <div className="space-y-3 rounded-[24px] border border-[var(--line)] bg-[rgba(19,35,29,0.03)] p-4">
          <input
            className="w-full rounded-[18px] border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none"
            value={form.title}
            onChange={(event) =>
              setForm((current) => ({ ...current, title: event.target.value }))
            }
          />
          <textarea
            className="min-h-24 w-full rounded-[18px] border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none"
            value={form.description}
            onChange={(event) =>
              setForm((current) => ({ ...current, description: event.target.value }))
            }
          />
          <div className="grid gap-3 md:grid-cols-2">
            <input
              type="datetime-local"
              className="rounded-[18px] border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none"
              value={form.pickupStartAt}
              onChange={(event) =>
                setForm((current) => ({ ...current, pickupStartAt: event.target.value }))
              }
            />
            <input
              type="datetime-local"
              className="rounded-[18px] border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none"
              value={form.pickupEndAt}
              onChange={(event) =>
                setForm((current) => ({ ...current, pickupEndAt: event.target.value }))
              }
            />
          </div>
          <select
            className="w-full rounded-[18px] border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none"
            value={form.assignedNodeId}
            onChange={(event) =>
              setForm((current) => ({ ...current, assignedNodeId: event.target.value }))
            }
          >
            {nodes.map((node) => (
              <option key={node.id} value={node.id}>
                {node.name}
              </option>
            ))}
          </select>
          <input
            className="w-full rounded-[18px] border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none"
            value={form.tags}
            onChange={(event) =>
              setForm((current) => ({ ...current, tags: event.target.value }))
            }
            placeholder="Label dipisahkan koma"
          />
          <input
            className="w-full rounded-[18px] border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none"
            value={form.imageUrl}
            onChange={(event) =>
              setForm((current) => ({ ...current, imageUrl: event.target.value }))
            }
            placeholder="/images/food-package.png atau tautan gambar publik"
          />
          <p className="text-xs text-[var(--ink-soft)]">
            Gunakan gambar lokal dari folder <code>public/images</code> atau tautan gambar publik.
          </p>
          <button
            type="button"
            disabled={isPending}
            className="rounded-full bg-[var(--foreground)] px-4 py-3 text-sm font-semibold text-white"
            onClick={() => {
              startTransition(async () => {
                setError(null);
                const response = await fetch(`/api/portions/${portion.id}`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    title: form.title,
                    description: form.description,
                    pickupStartAt: form.pickupStartAt,
                    pickupEndAt: form.pickupEndAt,
                    assignedNodeId: form.assignedNodeId,
                    tags: form.tags
                      .split(",")
                      .map((item) => item.trim())
                      .filter(Boolean),
                    imageUrl: form.imageUrl,
                  }),
                });
                const data = (await response.json()) as { error?: string };

                if (!response.ok) {
                  setError(data.error ?? "Gagal memperbarui paket.");
                  return;
                }

                setOpen(false);
                router.refresh();
              });
            }}
          >
            {isPending ? "Menyimpan..." : "Simpan paket"}
          </button>
          {error ? <p className="text-sm text-rose-700">{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
