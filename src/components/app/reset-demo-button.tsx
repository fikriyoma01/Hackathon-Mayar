"use client";

import { RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function ResetDemoButton() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-3">
      {message ? (
        <p className="text-xs font-medium text-emerald-700">{message}</p>
      ) : null}
      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold text-[var(--foreground)] hover:-translate-y-0.5"
        disabled={isPending}
        onClick={() => {
          startTransition(async () => {
            setMessage(null);
            const response = await fetch("/api/demo/reset", { method: "POST" });
            if (!response.ok) {
              setMessage("Setel ulang gagal.");
              return;
            }
            setMessage("Data contoh kembali ke kondisi awal.");
            router.refresh();
          });
        }}
      >
        <RotateCcw className="h-4 w-4" />
        {isPending ? "Menyetel ulang..." : "Setel ulang data contoh"}
      </button>
    </div>
  );
}
