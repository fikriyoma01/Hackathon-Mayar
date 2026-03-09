import Link from "next/link";

import { BulkTransactionSyncButton } from "@/components/dashboard/bulk-transaction-sync-button";
import { Panel } from "@/components/shared/panel";
import { StatusBadge } from "@/components/shared/status-badge";
import { requireSessionUser } from "@/lib/auth";
import { getDashboardSnapshot } from "@/lib/domain";
import {
  formatCurrency,
  formatDateTime,
  formatNumber,
  transactionStatusLabel,
} from "@/lib/format";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const user = await requireSessionUser();
  const snapshot = await getDashboardSnapshot(user.id);
  const params = await searchParams;
  const portions = new Map(snapshot.portions.map((portion) => [portion.id, portion]));
  const query = params.q?.trim().toLowerCase() ?? "";
  const statusFilter = params.status ?? "all";
  const filteredTransactions = snapshot.transactions.filter((transaction) => {
    const matchesStatus =
      statusFilter === "all" ? true : transaction.status === statusFilter;
    const batchTitle = portions.get(transaction.portionId)?.title.toLowerCase() ?? "";
    const matchesQuery =
      query.length === 0
        ? true
        : transaction.donorName.toLowerCase().includes(query) ||
          transaction.donorEmail.toLowerCase().includes(query) ||
          transaction.mayarInvoiceId.toLowerCase().includes(query) ||
          batchTitle.includes(query);

    return matchesStatus && matchesQuery;
  });

  return (
    <Panel
      title="Transaksi dan pembayaran"
      description="Riwayat pembayaran sponsor, status Mayar, dan voucher yang dihasilkan."
      action={user.role === "operator" ? null : <BulkTransactionSyncButton />}
    >
      <div className="grid gap-4 lg:grid-cols-4">
        <div className="rounded-[24px] bg-[rgba(19,35,29,0.04)] p-4">
          <p className="text-sm text-[var(--ink-soft)]">Total transaksi</p>
          <p className="mt-2 text-2xl font-black text-[var(--foreground)]">
            {formatNumber(filteredTransactions.length)}
          </p>
        </div>
        <div className="rounded-[24px] bg-[rgba(19,35,29,0.04)] p-4">
          <p className="text-sm text-[var(--ink-soft)]">Lunas</p>
          <p className="mt-2 text-2xl font-black text-[var(--foreground)]">
            {formatNumber(
              filteredTransactions.filter((transaction) => transaction.status === "paid")
                .length,
            )}
          </p>
        </div>
        <div className="rounded-[24px] bg-[rgba(19,35,29,0.04)] p-4">
          <p className="text-sm text-[var(--ink-soft)]">Menunggu</p>
          <p className="mt-2 text-2xl font-black text-[var(--foreground)]">
            {formatNumber(
              filteredTransactions.filter((transaction) => transaction.status === "pending")
                .length,
            )}
          </p>
        </div>
        <div className="rounded-[24px] bg-[rgba(19,35,29,0.04)] p-4">
          <p className="text-sm text-[var(--ink-soft)]">Nominal terfilter</p>
          <p className="mt-2 text-2xl font-black text-[var(--foreground)]">
            {formatCurrency(
              filteredTransactions.reduce(
                (total, transaction) => total + transaction.amount,
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
          placeholder="Cari donatur, kode pembayaran, atau paket"
          className="rounded-[18px] border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none"
        />
        <select
          name="status"
          defaultValue={statusFilter}
          className="rounded-[18px] border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none"
        >
          <option value="all">Semua status</option>
          <option value="pending">Menunggu pembayaran</option>
          <option value="paid">Lunas</option>
          <option value="failed">Gagal</option>
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
            href="/dashboard/transactions"
            className="rounded-full border border-[var(--line)] px-4 py-3 text-sm font-semibold text-[var(--foreground)]"
          >
            Reset
          </Link>
        </div>
      </form>

      <div className="mt-5 overflow-hidden rounded-[28px] border border-[var(--line)]">
        <table className="min-w-full divide-y divide-[var(--line)] bg-white/80 text-sm">
          <thead className="bg-[rgba(19,35,29,0.03)] text-left text-[var(--ink-soft)]">
            <tr>
              <th className="px-4 py-3 font-semibold">Donatur</th>
              <th className="px-4 py-3 font-semibold">Paket</th>
              <th className="px-4 py-3 font-semibold">Kode pembayaran</th>
              <th className="px-4 py-3 font-semibold">Nominal</th>
              <th className="px-4 py-3 font-semibold">Dibuat</th>
              <th className="px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-center text-[var(--ink-soft)]" colSpan={6}>
                  Tidak ada transaksi yang cocok dengan filter saat ini.
                </td>
              </tr>
            ) : (
              filteredTransactions.map((transaction) => (
                <tr key={transaction.id} className="border-t border-[var(--line)]">
                  <td className="px-4 py-4">
                    <Link
                      href={`/dashboard/transactions/${transaction.id}`}
                      className="font-semibold text-[var(--foreground)]"
                    >
                      {transaction.donorName}
                    </Link>
                    <p className="mt-1 text-xs text-[var(--ink-soft)]">
                      {transaction.donorEmail}
                    </p>
                  </td>
                  <td className="px-4 py-4 text-[var(--ink-soft)]">
                    {portions.get(transaction.portionId)?.title ?? "-"}
                  </td>
                  <td className="px-4 py-4 text-[var(--ink-soft)]">
                    {transaction.mayarInvoiceId}
                  </td>
                  <td className="px-4 py-4 font-semibold text-[var(--foreground)]">
                    {formatCurrency(transaction.amount)}
                  </td>
                  <td className="px-4 py-4 text-[var(--ink-soft)]">
                    {formatDateTime(transaction.createdAt)}
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge
                      status={transaction.status}
                      label={transactionStatusLabel(transaction.status)}
                    />
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
