import Link from "next/link";
import { notFound } from "next/navigation";

import { Panel } from "@/components/shared/panel";
import { StatusBadge } from "@/components/shared/status-badge";
import { requireSessionUser } from "@/lib/auth";
import { getDonorDetail } from "@/lib/domain";
import {
  formatCurrency,
  formatDateTime,
  formatNumber,
  transactionStatusLabel,
  voucherStatusLabel,
} from "@/lib/format";

export default async function DonorDetailPage({
  params,
}: {
  params: Promise<{ email: string }>;
}) {
  const user = await requireSessionUser();
  const { email } = await params;
  const detail = await getDonorDetail(user.id, decodeURIComponent(email));

  if (!detail) {
    notFound();
  }

  const portions = new Map(detail.portions.map((portion) => [portion.id, portion]));
  const distributions = new Map(
    detail.distributions
      .filter((distribution) => distribution.voucherId)
      .map((distribution) => [distribution.voucherId as string, distribution]),
  );

  return (
    <div className="space-y-6">
      <Panel
        title="Detail donatur"
        description="Lihat riwayat bantuan, pembayaran, voucher, dan penyaluran dari satu donatur."
      >
        <div className="grid gap-4 lg:grid-cols-4">
          <div className="rounded-[24px] border border-[var(--line)] bg-white/80 p-5 lg:col-span-2">
            <p className="text-sm text-[var(--ink-soft)]">Identitas</p>
            <p className="mt-2 text-2xl font-black text-[var(--foreground)]">
              {detail.donor.name}
            </p>
            <p className="mt-2 text-sm text-[var(--ink-soft)]">{detail.donor.email}</p>
            <p className="mt-1 text-sm text-[var(--ink-soft)]">{detail.donor.phone}</p>
          </div>
          <div className="rounded-[24px] border border-[var(--line)] bg-white/80 p-5">
            <p className="text-sm text-[var(--ink-soft)]">Total sponsor</p>
            <p className="mt-2 text-2xl font-black text-[var(--foreground)]">
              {formatNumber(detail.donor.sponsoredPortions)} porsi
            </p>
          </div>
          <div className="rounded-[24px] border border-[var(--line)] bg-white/80 p-5">
            <p className="text-sm text-[var(--ink-soft)]">Dana lunas</p>
            <p className="mt-2 text-2xl font-black text-[var(--foreground)]">
              {formatCurrency(detail.donor.settledAmount)}
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="rounded-[24px] bg-[rgba(19,35,29,0.04)] p-4">
            <p className="text-sm text-[var(--ink-soft)]">Transaksi total</p>
            <p className="mt-2 font-semibold text-[var(--foreground)]">
              {formatNumber(detail.donor.totalTransactions)}
            </p>
          </div>
          <div className="rounded-[24px] bg-[rgba(19,35,29,0.04)] p-4">
            <p className="text-sm text-[var(--ink-soft)]">Pembayaran menunggu</p>
            <p className="mt-2 font-semibold text-[var(--foreground)]">
              {detail.donor.pendingTransactions > 0
                ? formatCurrency(detail.donor.pendingAmount)
                : "Tidak ada"}
            </p>
          </div>
          <div className="rounded-[24px] bg-[rgba(19,35,29,0.04)] p-4">
            <p className="text-sm text-[var(--ink-soft)]">Aktivitas terakhir</p>
            <p className="mt-2 font-semibold text-[var(--foreground)]">
              {formatDateTime(detail.donor.lastActivityAt)}
            </p>
          </div>
        </div>
      </Panel>

      <Panel
        title="Riwayat transaksi"
        description="Setiap pembayaran tetap terhubung ke paket, voucher, dan detail penyaluran."
      >
        <div className="overflow-hidden rounded-[28px] border border-[var(--line)]">
          <table className="min-w-full divide-y divide-[var(--line)] bg-white/80 text-sm">
            <thead className="bg-[rgba(19,35,29,0.03)] text-left text-[var(--ink-soft)]">
              <tr>
                <th className="px-4 py-3 font-semibold">Paket</th>
                <th className="px-4 py-3 font-semibold">Kode pembayaran</th>
                <th className="px-4 py-3 font-semibold">Nominal</th>
                <th className="px-4 py-3 font-semibold">Porsi</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Detail</th>
              </tr>
            </thead>
            <tbody>
              {detail.transactions.map((transaction) => (
                <tr key={transaction.id} className="border-t border-[var(--line)]">
                  <td className="px-4 py-4 text-[var(--foreground)]">
                    {portions.get(transaction.portionId)?.title ?? "-"}
                  </td>
                  <td className="px-4 py-4 text-[var(--ink-soft)]">
                    {transaction.mayarInvoiceId}
                  </td>
                  <td className="px-4 py-4 font-semibold text-[var(--foreground)]">
                    {formatCurrency(transaction.amount)}
                  </td>
                  <td className="px-4 py-4 text-[var(--ink-soft)]">
                    {formatNumber(transaction.sponsoredPortions)}
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge
                      status={transaction.status}
                      label={transactionStatusLabel(transaction.status)}
                    />
                  </td>
                  <td className="px-4 py-4">
                    <Link
                      href={`/dashboard/transactions/${transaction.id}`}
                      className="font-semibold text-[var(--brand)]"
                    >
                      Buka transaksi
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel
          title="Voucher dan hasil penyaluran"
          description="Voucher yang sudah aktif, digunakan, atau dialihkan ke lokasi lain."
        >
          <div className="space-y-3">
            {detail.vouchers.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-[var(--line)] px-4 py-6 text-sm text-[var(--ink-soft)]">
                Donatur ini belum menghasilkan voucher aktif.
              </div>
            ) : (
              detail.vouchers.map((voucher) => (
                <div
                  key={voucher.id}
                  className="rounded-[24px] border border-[var(--line)] bg-white/80 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[var(--foreground)]">{voucher.code}</p>
                      <p className="mt-1 text-sm text-[var(--ink-soft)]">
                        {distributions.get(voucher.id)?.locationLabel ?? voucher.recipientAlias}
                      </p>
                    </div>
                    <StatusBadge
                      status={voucher.status}
                      label={voucherStatusLabel(voucher.status)}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </Panel>

        <Panel
          title="Timeline donatur"
          description="Catatan penting untuk memahami perjalanan bantuan dari pembayaran sampai penyaluran."
        >
          <div className="space-y-3">
            {detail.recentLogs.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-[var(--line)] px-4 py-6 text-sm text-[var(--ink-soft)]">
                Belum ada log tambahan untuk donatur ini.
              </div>
            ) : (
              detail.recentLogs.map((log) => (
                <div
                  key={log.id}
                  className="rounded-[24px] border border-[var(--line)] bg-white/80 p-4"
                >
                  <p className="font-semibold text-[var(--foreground)]">{log.title}</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">
                    {log.description}
                  </p>
                  <p className="mt-2 text-xs text-[var(--ink-soft)]">
                    {log.actor} · {formatDateTime(log.timestamp)}
                  </p>
                </div>
              ))
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}
