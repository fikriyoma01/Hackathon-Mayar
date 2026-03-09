"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { portionStatusLabel } from "@/lib/format";
import type { PortionStatus, UserRole } from "@/lib/types";

const options: PortionStatus[] = [
  "available",
  "sponsored",
  "distributing",
  "rerouted",
  "completed",
];

export function PortionStatusControl({
  portionId,
  currentStatus,
  actorName,
  actorRole,
}: {
  portionId: string;
  currentStatus: PortionStatus;
  actorName: string;
  actorRole: UserRole;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<PortionStatus>(currentStatus);
  const [requestNote, setRequestNote] = useState(
    "Mohon tinjau perubahan status paket ini agar catatan penyaluran tetap akurat.",
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const endpoint =
    actorRole === "admin"
      ? `/api/portions/${portionId}/status`
      : `/api/portions/${portionId}/status/request`;

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <select
          className="flex-1 rounded-full border border-[var(--line)] bg-white px-4 py-2 text-xs font-semibold text-[var(--foreground)] outline-none"
          value={status}
          onChange={(event) => setStatus(event.target.value as PortionStatus)}
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {portionStatusLabel(option)}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={isPending || status === currentStatus}
          className="rounded-full bg-[var(--foreground)] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
          onClick={() => {
            startTransition(async () => {
              setError(null);
              setSuccess(null);
              const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(
                  actorRole === "admin"
                    ? { status, actorName }
                    : { status, requestNote },
                ),
              });
              const data = (await response.json()) as { error?: string };

              if (!response.ok) {
                setError(data.error ?? "Gagal memproses perubahan status paket.");
                return;
              }

              setSuccess(
                actorRole === "admin"
                  ? "Status paket berhasil diperbarui."
                  : "Permintaan perubahan status berhasil diajukan.",
              );
              router.refresh();
            });
          }}
        >
          {isPending ? "Menyimpan..." : actorRole === "admin" ? "Perbarui" : "Ajukan"}
        </button>
      </div>
      {actorRole !== "admin" ? (
        <textarea
          className="min-h-20 w-full rounded-[18px] border border-[var(--line)] bg-white px-4 py-3 text-xs outline-none"
          value={requestNote}
          onChange={(event) => setRequestNote(event.target.value)}
        />
      ) : null}
      {error ? <p className="text-xs text-rose-700">{error}</p> : null}
      {success ? <p className="text-xs text-emerald-700">{success}</p> : null}
    </div>
  );
}
