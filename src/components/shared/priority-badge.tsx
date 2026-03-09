import type { DistributionPriority } from "@/lib/types";

const toneMap: Record<DistributionPriority, string> = {
  critical: "border-rose-200 bg-rose-50 text-rose-700",
  high: "border-amber-200 bg-amber-50 text-amber-700",
  normal: "border-sky-200 bg-sky-50 text-sky-700",
};

export function PriorityBadge({
  priority,
  label,
}: {
  priority: DistributionPriority;
  label: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${toneMap[priority]}`}
    >
      {label}
    </span>
  );
}
