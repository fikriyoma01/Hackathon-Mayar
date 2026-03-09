import Image from "next/image";
import Link from "next/link";

import { PriorityBadge } from "@/components/shared/priority-badge";
import { Panel } from "@/components/shared/panel";
import { StatusBadge } from "@/components/shared/status-badge";
import { requireSessionUser } from "@/lib/auth";
import { getDashboardSnapshot } from "@/lib/domain";
import {
  distributionStatusLabel,
  formatDateTime,
  formatNumber,
  distributionPriorityLabel,
} from "@/lib/format";

export default async function DistributionPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const user = await requireSessionUser();
  const snapshot = await getDashboardSnapshot(user.id);
  const params = await searchParams;
  const nodeById = new Map(snapshot.nodes.map((node) => [node.id, node]));
  const query = params.q?.trim().toLowerCase() ?? "";
  const statusFilter = params.status ?? "all";
  const filteredActivities = snapshot.distributions.filter((activity) => {
    const nodeName = nodeById.get(activity.nodeId)?.name.toLowerCase() ?? "";
    const matchesStatus =
      statusFilter === "all" ? true : activity.status === statusFilter;
    const matchesQuery =
      query.length === 0
        ? true
        : activity.locationLabel.toLowerCase().includes(query) ||
          activity.note.toLowerCase().includes(query) ||
          nodeName.includes(query);

    return matchesStatus && matchesQuery;
  });

  return (
    <Panel
      title="Penyaluran di lapangan"
      description="Pantau pengambilan, pengantaran, dokumentasi, dan pengalihan lokasi."
    >
      <div className="grid gap-4 lg:grid-cols-4">
        <div className="rounded-[24px] bg-[rgba(19,35,29,0.04)] p-4">
          <p className="text-sm text-[var(--ink-soft)]">Tugas terfilter</p>
          <p className="mt-2 text-2xl font-black text-[var(--foreground)]">
            {formatNumber(filteredActivities.length)}
          </p>
        </div>
        <div className="rounded-[24px] bg-[rgba(19,35,29,0.04)] p-4">
          <p className="text-sm text-[var(--ink-soft)]">Tugas terbuka</p>
          <p className="mt-2 text-2xl font-black text-[var(--foreground)]">
            {formatNumber(
              filteredActivities.filter((activity) => activity.status !== "completed")
                .length,
            )}
          </p>
        </div>
        <div className="rounded-[24px] bg-[rgba(19,35,29,0.04)] p-4">
          <p className="text-sm text-[var(--ink-soft)]">Dialihkan</p>
          <p className="mt-2 text-2xl font-black text-[var(--foreground)]">
            {formatNumber(
              filteredActivities.filter((activity) => activity.status === "rerouted")
                .length,
            )}
          </p>
        </div>
        <div className="rounded-[24px] bg-[rgba(19,35,29,0.04)] p-4">
          <p className="text-sm text-[var(--ink-soft)]">Terverifikasi</p>
          <p className="mt-2 text-2xl font-black text-[var(--foreground)]">
            {formatNumber(
              filteredActivities.filter(
                (activity) => activity.status === "verified",
              ).length,
            )}
          </p>
        </div>
      </div>

      <form className="mt-5 grid gap-3 rounded-[24px] border border-[var(--line)] bg-white/70 p-4 md:grid-cols-[1fr_220px_auto]">
        <input
          type="search"
          name="q"
          defaultValue={params.q ?? ""}
          placeholder="Cari lokasi, mitra penyaluran, atau catatan tugas"
          className="rounded-[18px] border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none"
        />
        <select
          name="status"
          defaultValue={statusFilter}
          className="rounded-[18px] border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none"
        >
          <option value="all">Semua status</option>
          <option value="queued">Menunggu diambil</option>
          <option value="on-route">Dalam perjalanan</option>
          <option value="verified">Terverifikasi</option>
          <option value="completed">Selesai</option>
          <option value="rerouted">Dialihkan</option>
        </select>
        <div className="flex gap-2">
          <button
            type="submit"
            className="rounded-full bg-[var(--brand)] px-4 py-3 text-sm font-semibold text-white"
          >
            Terapkan
          </button>
          <Link
            href="/dashboard/distribution"
            className="rounded-full border border-[var(--line)] px-4 py-3 text-sm font-semibold text-[var(--foreground)]"
          >
            Reset
          </Link>
        </div>
      </form>

      <div className="mt-5 grid gap-4">
        {filteredActivities.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-[var(--line)] px-4 py-6 text-sm text-[var(--ink-soft)]">
            Tidak ada aktivitas distribusi yang cocok dengan filter ini.
          </div>
        ) : (
          filteredActivities.map((activity) => (
            <Link
              key={activity.id}
              href={`/dashboard/distribution/${activity.id}`}
              className="overflow-hidden rounded-[30px] border border-[var(--line)] bg-white/80"
            >
              <div className="grid gap-4 p-5 lg:grid-cols-[1.2fr_0.8fr]">
                <div>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="display-font text-xl font-bold text-[var(--foreground)]">
                        {activity.locationLabel}
                      </p>
                      <p className="mt-2 text-sm text-[var(--ink-soft)]">
                        {nodeById.get(activity.nodeId)?.name ?? activity.locationLabel}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <PriorityBadge
                        priority={activity.priorityLevel ?? "normal"}
                        label={distributionPriorityLabel(activity.priorityLevel ?? "normal")}
                      />
                      <StatusBadge
                        status={activity.status}
                        label={distributionStatusLabel(activity.status)}
                      />
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-[var(--ink-soft)]">
                    {activity.note}
                  </p>
                  <p className="mt-3 text-xs text-[var(--ink-soft)]">
                    Diperbarui {formatDateTime(activity.updatedAt)}
                  </p>
                </div>
                <div className="overflow-hidden rounded-[24px] border border-[var(--line)] bg-[rgba(19,35,29,0.03)]">
                  {activity.proofImageUrl ? (
                    <Image
                      src={activity.proofImageUrl}
                      alt={activity.locationLabel}
                      width={720}
                      height={420}
                      className="h-full min-h-52 w-full object-cover"
                    />
                  ) : activity.routeImageUrl ? (
                    <Image
                      src={activity.routeImageUrl}
                      alt={activity.locationLabel}
                      width={720}
                      height={420}
                      className="h-full min-h-52 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full min-h-52 items-center justify-center px-4 text-center text-sm text-[var(--ink-soft)]">
                      Belum ada dokumentasi. Tugas ini masih menunggu foto dari lapangan.
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </Panel>
  );
}
