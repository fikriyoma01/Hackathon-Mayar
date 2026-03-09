import Link from "next/link";

import { Panel } from "@/components/shared/panel";
import { StatusBadge } from "@/components/shared/status-badge";
import { requireSessionUser } from "@/lib/auth";
import { getDashboardSnapshot } from "@/lib/domain";
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/format";

type DonorRecord = {
  name: string;
  email: string;
  phone: string;
  totalTransactions: number;
  paidTransactions: number;
  pendingTransactions: number;
  sponsoredPortions: number;
  settledAmount: number;
  pendingAmount: number;
  lastActivityAt: string;
};

export default async function DonorsPage() {
  const user = await requireSessionUser();
  const snapshot = await getDashboardSnapshot(user.id);
  const donorMap = new Map<string, DonorRecord>();

  for (const transaction of snapshot.transactions) {
    const current = donorMap.get(transaction.donorEmail) ?? {
      name: transaction.donorName,
      email: transaction.donorEmail,
      phone: transaction.donorPhone,
      totalTransactions: 0,
      paidTransactions: 0,
      pendingTransactions: 0,
      sponsoredPortions: 0,
      settledAmount: 0,
      pendingAmount: 0,
      lastActivityAt: transaction.createdAt,
    };

    current.totalTransactions += 1;
    current.sponsoredPortions += transaction.sponsoredPortions;

    if (transaction.status === "paid") {
      current.paidTransactions += 1;
      current.settledAmount += transaction.amount;
    }

    if (transaction.status === "pending") {
      current.pendingTransactions += 1;
      current.pendingAmount += transaction.amount;
    }

    if (new Date(transaction.createdAt) > new Date(current.lastActivityAt)) {
      current.lastActivityAt = transaction.createdAt;
    }

    donorMap.set(transaction.donorEmail, current);
  }

  const donors = [...donorMap.values()].sort(
    (left, right) =>
      new Date(right.lastActivityAt).getTime() - new Date(left.lastActivityAt).getTime(),
  );

  return (
    <Panel
      title="Direktori donatur"
      description="Ringkasan bantuan berdasarkan identitas donatur agar komunikasi dan riwayat pembayaran lebih rapi."
    >
      <div className="overflow-hidden rounded-[28px] border border-[var(--line)]">
        <table className="min-w-full divide-y divide-[var(--line)] bg-white/80 text-sm">
          <thead className="bg-[rgba(19,35,29,0.03)] text-left text-[var(--ink-soft)]">
            <tr>
              <th className="px-4 py-3 font-semibold">Donatur</th>
              <th className="px-4 py-3 font-semibold">Aktivitas</th>
              <th className="px-4 py-3 font-semibold">Porsi</th>
              <th className="px-4 py-3 font-semibold">Dana lunas</th>
              <th className="px-4 py-3 font-semibold">Menunggu</th>
              <th className="px-4 py-3 font-semibold">Terakhir</th>
            </tr>
          </thead>
          <tbody>
            {donors.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-[var(--ink-soft)]"
                >
                  Belum ada donatur pada cakupan ini.
                </td>
              </tr>
            ) : (
              donors.map((donor) => (
                <tr key={donor.email} className="border-t border-[var(--line)]">
                  <td className="px-4 py-4">
                    <Link
                      href={`/dashboard/donors/${encodeURIComponent(donor.email)}`}
                      className="font-semibold text-[var(--foreground)]"
                    >
                      {donor.name}
                    </Link>
                    <p className="mt-1 text-xs text-[var(--ink-soft)]">{donor.email}</p>
                    <p className="mt-1 text-xs text-[var(--ink-soft)]">{donor.phone}</p>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge
                        status={donor.paidTransactions > 0 ? "paid" : "pending"}
                        label={`${formatNumber(donor.paidTransactions)} lunas`}
                      />
                      {donor.pendingTransactions > 0 ? (
                        <StatusBadge
                          status="pending"
                          label={`${formatNumber(donor.pendingTransactions)} menunggu`}
                        />
                      ) : null}
                    </div>
                    <p className="mt-2 text-xs text-[var(--ink-soft)]">
                      {formatNumber(donor.totalTransactions)} transaksi
                    </p>
                  </td>
                  <td className="px-4 py-4 font-semibold text-[var(--foreground)]">
                    {formatNumber(donor.sponsoredPortions)}
                  </td>
                  <td className="px-4 py-4 font-semibold text-[var(--foreground)]">
                    {formatCurrency(donor.settledAmount)}
                  </td>
                  <td className="px-4 py-4 text-[var(--ink-soft)]">
                    {donor.pendingTransactions > 0
                      ? formatCurrency(donor.pendingAmount)
                      : "-"}
                  </td>
                  <td className="px-4 py-4 text-[var(--ink-soft)]">
                    {formatDateTime(donor.lastActivityAt)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
