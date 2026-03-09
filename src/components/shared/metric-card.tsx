import type { LucideIcon } from "lucide-react";

import { cx } from "@/lib/utils";

export function MetricCard({
  title,
  value,
  caption,
  icon: Icon,
  accent = "emerald",
  className,
}: {
  title: string;
  value: string;
  caption: string;
  icon: LucideIcon;
  accent?: "emerald" | "amber" | "sky" | "rose";
  className?: string;
}) {
  const accentMap = {
    emerald: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    sky: "bg-sky-100 text-sky-700",
    rose: "bg-rose-100 text-rose-700",
  } as const;

  return (
    <article className={cx("surface-card rounded-[28px] p-5", className)}>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-[var(--ink-soft)]">{title}</p>
          <p className="mt-3 text-3xl font-black tracking-tight text-[var(--foreground)]">
            {value}
          </p>
        </div>
        <div
          className={cx(
            "flex h-12 w-12 items-center justify-center rounded-2xl",
            accentMap[accent],
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="text-sm leading-6 text-[var(--ink-soft)]">{caption}</p>
    </article>
  );
}
