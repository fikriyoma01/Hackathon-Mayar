"use client";

import { Power, PowerOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function StatusToggleButton({
  endpoint,
  active,
  activeLabel = "Aktif",
  inactiveLabel = "Jeda",
}: {
  endpoint: string;
  active: boolean;
  activeLabel?: string;
  inactiveLabel?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        disabled={isPending}
        className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold text-[var(--foreground)]"
        onClick={() => {
          startTransition(async () => {
            setError(null);
            const response = await fetch(endpoint, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ active: !active }),
            });
            const data = (await response.json()) as { error?: string };

            if (!response.ok) {
              setError(data.error ?? "Gagal memperbarui status.");
              return;
            }

            router.refresh();
          });
        }}
      >
        {active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
        {isPending
          ? "Menyimpan..."
          : active
            ? `Set ${inactiveLabel}`
            : `Set ${activeLabel}`}
      </button>
      {error ? <p className="text-xs text-rose-700">{error}</p> : null}
    </div>
  );
}
