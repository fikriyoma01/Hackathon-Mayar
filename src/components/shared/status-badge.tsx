import type {
  ApprovalStatus,
  DistributionStatus,
  PortionStatus,
  TransactionStatus,
  VoucherStatus,
} from "@/lib/types";
import { cx } from "@/lib/utils";

type KnownStatus =
  | PortionStatus
  | TransactionStatus
  | VoucherStatus
  | DistributionStatus
  | ApprovalStatus;

const toneMap: Record<KnownStatus, string> = {
  available: "border-emerald-200 bg-emerald-50 text-emerald-700",
  sponsored: "border-amber-200 bg-amber-50 text-amber-700",
  distributing: "border-sky-200 bg-sky-50 text-sky-700",
  rerouted: "border-rose-200 bg-rose-50 text-rose-700",
  completed: "border-teal-200 bg-teal-50 text-teal-700",
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  paid: "border-teal-200 bg-teal-50 text-teal-700",
  failed: "border-rose-200 bg-rose-50 text-rose-700",
  expired: "border-zinc-200 bg-zinc-100 text-zinc-600",
  active: "border-emerald-200 bg-emerald-50 text-emerald-700",
  approved: "border-teal-200 bg-teal-50 text-teal-700",
  redeemed: "border-teal-200 bg-teal-50 text-teal-700",
  rejected: "border-rose-200 bg-rose-50 text-rose-700",
  queued: "border-amber-200 bg-amber-50 text-amber-700",
  "on-route": "border-sky-200 bg-sky-50 text-sky-700",
  verified: "border-indigo-200 bg-indigo-50 text-indigo-700",
};

export function StatusBadge({
  status,
  label,
  className,
}: {
  status: KnownStatus;
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold",
        toneMap[status],
        className,
      )}
    >
      {label ?? status}
    </span>
  );
}
