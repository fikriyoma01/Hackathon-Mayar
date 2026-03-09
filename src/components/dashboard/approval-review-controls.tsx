"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function ApprovalReviewControls({
  requestId,
}: {
  requestId: string;
}) {
  const router = useRouter();
  const [reviewNote, setReviewNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const submit = (action: "approve" | "reject") => {
    startTransition(async () => {
      setError(null);
      const response = await fetch(`/api/approvals/${requestId}/${action}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reviewNote }),
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(data.error ?? "Gagal memproses approval.");
        return;
      }

      router.refresh();
    });
  };

  return (
    <div className="space-y-3">
      <textarea
        className="min-h-20 w-full rounded-[18px] border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none"
        value={reviewNote}
        onChange={(event) => setReviewNote(event.target.value)}
        placeholder="Catatan persetujuan (opsional)"
      />
      <div className="flex gap-2">
        <button
          type="button"
          disabled={isPending}
          className="rounded-full bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white"
          onClick={() => submit("approve")}
        >
          Terima
        </button>
        <button
          type="button"
          disabled={isPending}
          className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700"
          onClick={() => submit("reject")}
        >
          Tolak
        </button>
      </div>
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
    </div>
  );
}
