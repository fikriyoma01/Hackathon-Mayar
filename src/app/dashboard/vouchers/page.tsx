import Image from "next/image";
import Link from "next/link";

import { Panel } from "@/components/shared/panel";
import { QrGrid } from "@/components/shared/qr-grid";
import { StatusBadge } from "@/components/shared/status-badge";
import { requireSessionUser } from "@/lib/auth";
import { getDashboardSnapshot } from "@/lib/domain";
import {
  formatDateTime,
  formatNumber,
  voucherStatusLabel,
} from "@/lib/format";

export default async function VouchersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const user = await requireSessionUser();
  const snapshot = await getDashboardSnapshot(user.id);
  const params = await searchParams;
  const portionById = new Map(snapshot.portions.map((portion) => [portion.id, portion]));
  const query = params.q?.trim().toLowerCase() ?? "";
  const statusFilter = params.status ?? "all";
  const filteredVouchers = snapshot.vouchers.filter((voucher) => {
    const portionTitle = portionById.get(voucher.portionId)?.title.toLowerCase() ?? "";
    const matchesStatus =
      statusFilter === "all" ? true : voucher.status === statusFilter;
    const matchesQuery =
      query.length === 0
        ? true
        : voucher.code.toLowerCase().includes(query) ||
          voucher.recipientAlias.toLowerCase().includes(query) ||
          portionTitle.includes(query);

    return matchesStatus && matchesQuery;
  });

  return (
    <Panel
      title="Voucher digital"
      description="Voucher aktif, terpakai, atau dialihkan agar penyaluran tetap cepat dan mudah dilacak."
    >
      <div className="grid gap-4 lg:grid-cols-4">
        <div className="rounded-[24px] bg-[rgba(19,35,29,0.04)] p-4">
          <p className="text-sm text-[var(--ink-soft)]">Voucher terfilter</p>
          <p className="mt-2 text-2xl font-black text-[var(--foreground)]">
            {formatNumber(filteredVouchers.length)}
          </p>
        </div>
        <div className="rounded-[24px] bg-[rgba(19,35,29,0.04)] p-4">
          <p className="text-sm text-[var(--ink-soft)]">Aktif</p>
          <p className="mt-2 text-2xl font-black text-[var(--foreground)]">
            {formatNumber(
              filteredVouchers.filter((voucher) => voucher.status === "active").length,
            )}
          </p>
        </div>
        <div className="rounded-[24px] bg-[rgba(19,35,29,0.04)] p-4">
          <p className="text-sm text-[var(--ink-soft)]">Tertebus</p>
          <p className="mt-2 text-2xl font-black text-[var(--foreground)]">
            {formatNumber(
              filteredVouchers.filter((voucher) => voucher.status === "redeemed").length,
            )}
          </p>
        </div>
        <div className="rounded-[24px] bg-[rgba(19,35,29,0.04)] p-4">
          <p className="text-sm text-[var(--ink-soft)]">Dialihkan</p>
          <p className="mt-2 text-2xl font-black text-[var(--foreground)]">
            {formatNumber(
              filteredVouchers.filter((voucher) => voucher.status === "rerouted").length,
            )}
          </p>
        </div>
      </div>

      <form className="mt-5 grid gap-3 rounded-[24px] border border-[var(--line)] bg-white/70 p-4 md:grid-cols-[1fr_220px_auto]">
        <input
          type="search"
          name="q"
          defaultValue={params.q ?? ""}
          placeholder="Cari kode voucher, penerima, atau paket"
          className="rounded-[18px] border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none"
        />
        <select
          name="status"
          defaultValue={statusFilter}
          className="rounded-[18px] border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none"
        >
          <option value="all">Semua status</option>
          <option value="active">Aktif</option>
          <option value="redeemed">Tertebus</option>
          <option value="rerouted">Dialihkan</option>
          <option value="expired">Kedaluwarsa</option>
        </select>
        <div className="flex gap-2">
          <button
            type="submit"
            className="rounded-full bg-[var(--brand)] px-4 py-3 text-sm font-semibold text-white"
          >
            Terapkan
          </button>
          <Link
            href="/dashboard/vouchers"
            className="rounded-full border border-[var(--line)] px-4 py-3 text-sm font-semibold text-[var(--foreground)]"
          >
            Reset
          </Link>
        </div>
      </form>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        {filteredVouchers.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-[var(--line)] px-4 py-6 text-sm text-[var(--ink-soft)]">
            Tidak ada voucher yang cocok dengan filter saat ini.
          </div>
        ) : (
          filteredVouchers.map((voucher) => (
            <article
              key={voucher.id}
              className="rounded-[30px] border border-[var(--line)] bg-white/80 p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="display-font text-xl font-bold text-[var(--foreground)]">
                    {voucher.code}
                  </p>
                  <p className="mt-2 text-sm text-[var(--ink-soft)]">
                    {portionById.get(voucher.portionId)?.title ?? "-"}
                  </p>
                </div>
                <StatusBadge
                  status={voucher.status}
                  label={voucherStatusLabel(voucher.status)}
                />
              </div>
              <div className="mt-5 grid gap-4 md:grid-cols-[0.95fr_1.05fr]">
                <div className="space-y-3">
                  <div className="overflow-hidden rounded-[24px] border border-[var(--line)]">
                    <Image
                      src={voucher.imageUrl ?? "/images/digital-voucher.png"}
                      alt={voucher.code}
                      width={960}
                      height={720}
                      className="h-44 w-full object-cover"
                    />
                  </div>
                  <QrGrid value={voucher.qrPayload} />
                </div>
                <div className="space-y-3">
                  <div className="rounded-[22px] bg-[rgba(19,35,29,0.04)] p-4">
                    <p className="text-sm text-[var(--ink-soft)]">Penerima / lokasi</p>
                    <p className="mt-1 font-semibold text-[var(--foreground)]">
                      {voucher.recipientAlias}
                    </p>
                  </div>
                  <div className="rounded-[22px] bg-[rgba(19,35,29,0.04)] p-4">
                    <p className="text-sm text-[var(--ink-soft)]">Batas penggunaan</p>
                    <p className="mt-1 font-semibold text-[var(--foreground)]">
                      {formatDateTime(voucher.expiresAt)}
                    </p>
                  </div>
                  <Link
                    href={`/voucher/${voucher.code}`}
                    className="inline-flex rounded-full bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white"
                  >
                    Lihat voucher publik
                  </Link>
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </Panel>
  );
}
