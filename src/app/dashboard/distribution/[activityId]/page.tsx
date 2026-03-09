import Image from "next/image";
import { notFound } from "next/navigation";

import { DistributionRerouteForm } from "@/components/dashboard/distribution-reroute-form";
import { PriorityBadge } from "@/components/shared/priority-badge";
import { Panel } from "@/components/shared/panel";
import { StatusBadge } from "@/components/shared/status-badge";
import { requireSessionUser } from "@/lib/auth";
import { getDistributionDetail } from "@/lib/domain";
import {
  distributionPriorityLabel,
  distributionStatusLabel,
  formatDateTime,
  voucherStatusLabel,
} from "@/lib/format";

export default async function DistributionDetailPage({
  params,
}: {
  params: Promise<{ activityId: string }>;
}) {
  const user = await requireSessionUser();
  const { activityId } = await params;
  const detail = await getDistributionDetail(user.id, activityId);

  if (!detail) {
    notFound();
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <Panel
        title="Detail penyaluran"
        description="Status tugas, petugas lapangan, lokasi penyaluran, dan dokumentasi."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-[24px] border border-[var(--line)] bg-white/80 p-5">
            <p className="text-sm text-[var(--ink-soft)]">Lokasi penyaluran</p>
            <p className="mt-2 text-xl font-bold text-[var(--foreground)]">
              {detail.activity.locationLabel}
            </p>
            <p className="mt-1 text-sm text-[var(--ink-soft)]">
              {detail.node?.name ?? "-"}
            </p>
          </div>
          <div className="rounded-[24px] border border-[var(--line)] bg-white/80 p-5">
            <p className="text-sm text-[var(--ink-soft)]">Status dan prioritas</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <PriorityBadge
                priority={detail.activity.priorityLevel ?? "normal"}
                label={distributionPriorityLabel(detail.activity.priorityLevel ?? "normal")}
              />
              <StatusBadge
                status={detail.activity.status}
                label={distributionStatusLabel(detail.activity.status)}
              />
            </div>
          </div>
          <div className="rounded-[24px] border border-[var(--line)] bg-white/80 p-5">
            <p className="text-sm text-[var(--ink-soft)]">Pelaksana</p>
            <p className="mt-2 font-semibold text-[var(--foreground)]">
              {detail.activity.actorName}
            </p>
            <p className="mt-1 text-sm text-[var(--ink-soft)]">
              {detail.activity.actorRole}
            </p>
          </div>
          <div className="rounded-[24px] border border-[var(--line)] bg-white/80 p-5">
            <p className="text-sm text-[var(--ink-soft)]">Diperbarui</p>
            <p className="mt-2 font-semibold text-[var(--foreground)]">
              {formatDateTime(detail.activity.updatedAt)}
            </p>
          </div>
        </div>
        <div className="mt-6 rounded-[28px] border border-[var(--line)] bg-white/80 p-5">
          <p className="text-sm text-[var(--ink-soft)]">Catatan tugas</p>
          <p className="mt-3 text-sm leading-7 text-[var(--foreground)]">
            {detail.activity.note}
          </p>
        </div>
        {detail.voucher ? (
          <div className="mt-6 rounded-[28px] border border-[var(--line)] bg-white/80 p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm text-[var(--ink-soft)]">Voucher terkait</p>
                <p className="mt-2 font-semibold text-[var(--foreground)]">
                  {detail.voucher.code}
                </p>
              </div>
              <StatusBadge
                status={detail.voucher.status}
                label={voucherStatusLabel(detail.voucher.status)}
              />
            </div>
          </div>
        ) : null}
        {(user.role === "admin" || user.role === "operator") &&
        detail.activity.status !== "completed" ? (
          <div className="mt-6">
            <DistributionRerouteForm
              activityId={detail.activity.id}
              currentNodeId={detail.activity.nodeId}
              actorName={user.name}
              actorRole={user.role}
              nodes={detail.nodes}
            />
          </div>
        ) : null}
      </Panel>

      <Panel title="Dokumentasi lapangan" description="Foto atau dokumentasi yang diunggah dari tampilan seluler.">
        {detail.activity.proofImageUrl ? (
          <div className="overflow-hidden rounded-[30px] border border-[var(--line)]">
            <Image
              src={detail.activity.proofImageUrl}
              alt={detail.activity.locationLabel}
              width={960}
              height={720}
              className="h-auto w-full object-cover"
            />
          </div>
        ) : detail.activity.routeImageUrl ? (
          <div className="overflow-hidden rounded-[30px] border border-[var(--line)]">
            <Image
              src={detail.activity.routeImageUrl}
              alt={detail.activity.locationLabel}
              width={960}
              height={720}
              className="h-auto w-full object-cover"
            />
          </div>
        ) : (
          <div className="rounded-[28px] border border-dashed border-[var(--line)] px-4 py-10 text-center text-sm text-[var(--ink-soft)]">
            Dokumentasi belum tersedia. Gunakan tampilan seluler untuk mengunggah foto.
          </div>
        )}
      </Panel>
    </div>
  );
}
