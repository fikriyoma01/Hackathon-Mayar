import Image from "next/image";
import Link from "next/link";

import { PortionEditorCard } from "@/components/dashboard/portion-editor-card";
import { Panel } from "@/components/shared/panel";
import { StatusBadge } from "@/components/shared/status-badge";
import { requireSessionUser } from "@/lib/auth";
import { getDashboardSnapshot } from "@/lib/domain";
import {
  formatCurrency,
  formatDateTime,
  formatNumber,
  portionStatusLabel,
} from "@/lib/format";

export default async function PortionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const user = await requireSessionUser();
  const snapshot = await getDashboardSnapshot(user.id);
  const params = await searchParams;
  const query = params.q?.trim().toLowerCase() ?? "";
  const statusFilter = params.status ?? "all";
  const canManagePortions = user.role === "admin" || user.role === "merchant";
  const merchantById = new Map(snapshot.merchants.map((merchant) => [merchant.id, merchant]));
  const filteredPortions = snapshot.portions.filter((portion) => {
    const merchantName = merchantById.get(portion.merchantId)?.name.toLowerCase() ?? "";
    const matchesStatus =
      statusFilter === "all" ? true : portion.status === statusFilter;
    const matchesQuery =
      query.length === 0
        ? true
        : portion.title.toLowerCase().includes(query) ||
          portion.description.toLowerCase().includes(query) ||
          merchantName.includes(query);

    return matchesStatus && matchesQuery;
  });

  return (
    <Panel
      title="Paket makanan"
      description={
        canManagePortions
          ? "Edit paket, atur waktu pengambilan, dan hapus paket yang belum punya transaksi aktif."
          : "Pantau detail paket, waktu pengambilan, dan status bantuan per merchant."
      }
    >
      <div className="grid gap-4 lg:grid-cols-4">
        <div className="rounded-[24px] bg-[rgba(19,35,29,0.04)] p-4">
          <p className="text-sm text-[var(--ink-soft)]">Paket terfilter</p>
          <p className="mt-2 text-2xl font-black text-[var(--foreground)]">
            {formatNumber(filteredPortions.length)}
          </p>
        </div>
        <div className="rounded-[24px] bg-[rgba(19,35,29,0.04)] p-4">
          <p className="text-sm text-[var(--ink-soft)]">Tersedia</p>
          <p className="mt-2 text-2xl font-black text-[var(--foreground)]">
            {formatNumber(
              filteredPortions.filter((portion) => portion.status === "available").length,
            )}
          </p>
        </div>
        <div className="rounded-[24px] bg-[rgba(19,35,29,0.04)] p-4">
          <p className="text-sm text-[var(--ink-soft)]">Tersponsor</p>
          <p className="mt-2 text-2xl font-black text-[var(--foreground)]">
            {formatNumber(
              filteredPortions.filter((portion) => portion.status === "sponsored").length,
            )}
          </p>
        </div>
        <div className="rounded-[24px] bg-[rgba(19,35,29,0.04)] p-4">
          <p className="text-sm text-[var(--ink-soft)]">Nilai sponsor</p>
          <p className="mt-2 text-2xl font-black text-[var(--foreground)]">
            {formatCurrency(
              filteredPortions.reduce(
                (total, portion) => total + portion.sponsorPrice * portion.totalPortions,
                0,
              ),
            )}
          </p>
        </div>
      </div>

      <form className="mt-5 grid gap-3 rounded-[24px] border border-[var(--line)] bg-white/70 p-4 md:grid-cols-[1fr_220px_auto]">
        <input
          type="search"
          name="q"
          defaultValue={params.q ?? ""}
          placeholder="Cari paket atau merchant"
          className="rounded-[18px] border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none"
        />
        <select
          name="status"
          defaultValue={statusFilter}
          className="rounded-[18px] border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none"
        >
          <option value="all">Semua status</option>
          <option value="available">Tersedia</option>
          <option value="sponsored">Tersponsor</option>
          <option value="distributing">Sedang disalurkan</option>
          <option value="rerouted">Dialihkan</option>
          <option value="completed">Selesai</option>
        </select>
        <div className="flex gap-2">
          <button
            type="submit"
            className="rounded-full bg-[var(--brand)] px-4 py-3 text-sm font-semibold text-white"
          >
            Terapkan
          </button>
          <Link
            href="/dashboard/portions"
            className="rounded-full border border-[var(--line)] px-4 py-3 text-sm font-semibold text-[var(--foreground)]"
          >
            Reset
          </Link>
        </div>
      </form>

      <div className="mt-5 grid gap-4">
        {filteredPortions.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-[var(--line)] px-4 py-6 text-sm text-[var(--ink-soft)]">
            Tidak ada paket yang cocok dengan filter ini.
          </div>
        ) : (
          filteredPortions.map((portion) => (
            <article
              key={portion.id}
              className="overflow-hidden rounded-[28px] border border-[var(--line)] bg-white/80"
            >
              <div className="grid gap-4 p-5 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="overflow-hidden rounded-[24px] border border-[var(--line)]">
                  <Image
                    src={portion.imageUrl ?? "/images/food-package.png"}
                    alt={portion.title}
                    width={960}
                    height={640}
                    className="h-full min-h-52 w-full object-cover"
                  />
                </div>
                <div className="space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="display-font text-2xl font-bold text-[var(--foreground)]">
                        {portion.title}
                      </p>
                      <p className="mt-2 text-sm text-[var(--ink-soft)]">
                        {merchantById.get(portion.merchantId)?.name ?? "-"}
                      </p>
                    </div>
                    <StatusBadge
                      status={portion.status}
                      label={portionStatusLabel(portion.status)}
                    />
                  </div>
                  <p className="text-sm leading-6 text-[var(--ink-soft)]">
                    {portion.description}
                  </p>
                  <div className="grid gap-3 text-sm sm:grid-cols-2">
                    <div className="rounded-[22px] bg-[rgba(19,35,29,0.04)] p-4">
                      <p className="text-[var(--ink-soft)]">Waktu pengambilan</p>
                      <p className="mt-1 font-semibold text-[var(--foreground)]">
                        {formatDateTime(portion.pickupStartAt)}
                      </p>
                    </div>
                    <div className="rounded-[22px] bg-[rgba(19,35,29,0.04)] p-4">
                      <p className="text-[var(--ink-soft)]">Lokasi penyaluran</p>
                      <p className="mt-1 font-semibold text-[var(--foreground)]">
                        {snapshot.nodes.find((node) => node.id === portion.assignedNodeId)?.name ??
                          "-"}
                      </p>
                    </div>
                  </div>
                  {canManagePortions ? (
                    <PortionEditorCard portion={portion} nodes={snapshot.nodes} />
                  ) : (
                    <div className="rounded-[22px] border border-[var(--line)] bg-[rgba(19,35,29,0.03)] p-4 text-sm leading-6 text-[var(--ink-soft)]">
                      Perubahan paket dilakukan oleh pengelola pusat atau merchant terkait. Petugas lapangan dapat memakai halaman ini sebagai referensi pengambilan dan penyaluran.
                    </div>
                  )}
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </Panel>
  );
}
