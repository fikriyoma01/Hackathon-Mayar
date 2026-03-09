"use client";

import { CornerDownRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type { DistributionNode, UserRole } from "@/lib/types";

export function DistributionRerouteForm({
  activityId,
  currentNodeId,
  actorName,
  actorRole,
  nodes,
}: {
  activityId: string;
  currentNodeId: string;
  actorName: string;
  actorRole: UserRole;
  nodes: DistributionNode[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const availableNodes = nodes.filter((node) => node.active && node.id !== currentNodeId);
  const [nodeId, setNodeId] = useState(availableNodes[0]?.id ?? "");
  const [note, setNote] = useState(
    "Dialihkan manual agar penyaluran tetap tepat waktu sebelum berbuka.",
  );
  const endpoint =
    actorRole === "admin"
      ? `/api/distribution/${activityId}/reroute`
      : `/api/distribution/${activityId}/reroute/request`;

  if (availableNodes.length === 0) {
    return (
      <div className="rounded-[24px] border border-dashed border-[var(--line)] px-4 py-6 text-sm text-[var(--ink-soft)]">
        Belum ada lokasi aktif lain yang bisa dipilih untuk pengalihan manual.
      </div>
    );
  }

  return (
    <div className="rounded-[28px] border border-[var(--line)] bg-white/80 p-5">
      <p className="font-semibold text-[var(--foreground)]">
        {actorRole === "admin" ? "Alihkan lokasi penyaluran" : "Ajukan pengalihan"}
      </p>
      <p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">
        {actorRole === "admin"
          ? "Pindahkan tugas ini ke lokasi aktif lain jika pengambilan atau penyaluran perlu dialihkan cepat."
          : "Ajukan perpindahan lokasi agar pengelola bisa meninjau perubahan sebelum dijalankan."}
      </p>
      <div className="mt-4 space-y-3">
        <select
          className="w-full rounded-[20px] border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none"
          value={nodeId}
          onChange={(event) => setNodeId(event.target.value)}
        >
          {availableNodes.map((node) => (
            <option key={node.id} value={node.id}>
              {node.name} - {node.area}
            </option>
          ))}
        </select>
        <textarea
          className="min-h-24 w-full rounded-[20px] border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none"
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
        <button
          type="button"
          disabled={isPending}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--brand)] px-4 py-3 text-sm font-semibold text-white"
          onClick={() => {
            startTransition(async () => {
              setError(null);
              setSuccess(null);
              const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  nodeId,
                  actorName,
                  note,
                }),
              });
              const data = (await response.json()) as { error?: string };

              if (!response.ok) {
                setError(data.error ?? "Pengalihan belum bisa diproses.");
                return;
              }

              setSuccess(
                actorRole === "admin"
                  ? "Tugas berhasil dialihkan ke lokasi tujuan."
                  : "Permintaan pengalihan berhasil diajukan ke pengelola.",
              );
              router.refresh();
            });
          }}
        >
          <CornerDownRight className="h-4 w-4" />
          {isPending
            ? actorRole === "admin"
              ? "Mengalihkan..."
              : "Mengajukan..."
            : actorRole === "admin"
              ? "Alihkan sekarang"
              : "Ajukan pengalihan"}
        </button>
        {error ? <p className="text-sm text-rose-700">{error}</p> : null}
        {success ? <p className="text-sm text-emerald-700">{success}</p> : null}
      </div>
    </div>
  );
}
