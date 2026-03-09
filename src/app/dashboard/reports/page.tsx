import Link from "next/link";

import { MetricCard } from "@/components/shared/metric-card";
import { Panel } from "@/components/shared/panel";
import { StatusBadge } from "@/components/shared/status-badge";
import { requireSessionUser } from "@/lib/auth";
import { getDashboardSnapshot } from "@/lib/domain";
import {
  distributionStatusLabel,
  formatCurrency,
  formatNumber,
  transactionStatusLabel,
  voucherStatusLabel,
} from "@/lib/format";
import { Activity, BadgeDollarSign, Route, Ticket } from "lucide-react";

function percent(numerator: number, denominator: number) {
  if (denominator === 0) {
    return "0%";
  }

  return `${Math.round((numerator / denominator) * 100)}%`;
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

type AlertItem = {
  status: "pending" | "active" | "rerouted";
  title: string;
  body: string;
};

export default async function ReportsPage() {
  const user = await requireSessionUser();
  const snapshot = await getDashboardSnapshot(user.id);

  const merchantRows = snapshot.merchants.map((merchant) => {
    const portions = snapshot.portions.filter((portion) => portion.merchantId === merchant.id);
    const portionIds = new Set(portions.map((portion) => portion.id));
    const transactions = snapshot.transactions.filter((transaction) =>
      portionIds.has(transaction.portionId),
    );

    return {
      merchant,
      distributed: sum(portions.map((portion) => portion.distributedPortions)),
      totalSponsored: sum(transactions.map((transaction) => transaction.sponsoredPortions)),
      settledAmount: sum(
        transactions
          .filter((transaction) => transaction.status === "paid")
          .map((transaction) => transaction.amount),
      ),
      pendingInvoices: transactions.filter((transaction) => transaction.status === "pending")
        .length,
    };
  });

  const nodeRows = snapshot.nodes.map((node) => {
    const activities = snapshot.distributions.filter((activity) => activity.nodeId === node.id);
    return {
      node,
      completed: activities.filter((activity) => activity.status === "completed").length,
      rerouted: activities.filter((activity) => activity.status === "rerouted").length,
      verified: activities.filter((activity) => activity.status === "verified").length,
      proofs: activities.filter((activity) => activity.proofImageUrl).length,
    };
  });

  const voucherRedeemed = snapshot.vouchers.filter((voucher) => voucher.status === "redeemed").length;
  const activeVouchers = snapshot.vouchers.filter((voucher) => voucher.status === "active").length;
  const pendingPayments = snapshot.transactions.filter(
    (transaction) => transaction.status === "pending",
  ).length;

  const alerts = [
    pendingPayments > 0
      ? {
          status: "pending" as const,
          title: "Pembayaran menunggu perlu dipantau",
          body: `${formatNumber(pendingPayments)} pembayaran masih menunggu penyelesaian atau pembaruan status.`,
        }
      : null,
    activeVouchers > 0
      ? {
          status: "active" as const,
          title: "Voucher aktif di lapangan",
          body: `${formatNumber(activeVouchers)} voucher masih beredar dan menunggu verifikasi.`,
        }
      : null,
    snapshot.distributions.some((activity) => activity.status === "rerouted")
      ? {
          status: "rerouted" as const,
          title: "Ada distribusi yang dialihkan",
          body: "Periksa lokasi tujuan agar paket tetap sampai sebelum berbuka.",
        }
      : null,
  ].filter((alert): alert is AlertItem => alert !== null);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-4">
        <MetricCard
          title="Porsi tersalurkan"
          value={percent(
            snapshot.metrics.distributedPortions,
            snapshot.metrics.distributedPortions + snapshot.metrics.availablePortions,
          )}
          caption="Persentase porsi yang berhasil bergerak menjadi penyaluran tervalidasi."
          icon={Activity}
          accent="emerald"
        />
        <MetricCard
          title="Voucher digunakan"
          value={percent(voucherRedeemed, snapshot.vouchers.length)}
          caption="Rasio voucher yang sudah benar-benar ditebus di lapangan."
          icon={Ticket}
          accent="sky"
        />
        <MetricCard
          title="Dana tercatat"
          value={formatCurrency(snapshot.metrics.mayarSettled)}
          caption="Akumulasi invoice yang berhasil masuk ke alur penyaluran."
          icon={BadgeDollarSign}
          accent="amber"
        />
        <MetricCard
          title="Tugas selesai"
          value={percent(
            snapshot.distributions.filter((activity) => activity.status === "completed").length,
            snapshot.distributions.length,
          )}
          caption="Persentase aktivitas distribusi yang sudah ditutup sebagai selesai."
          icon={Route}
          accent="rose"
        />
      </section>

      <Panel
        title="Laporan dan pemantauan"
        description="Unduh data penyaluran dalam CSV atau cek perhatian yang perlu ditindak."
        action={
          <Link
            href="/api/reports/impact"
            className="inline-flex rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold text-[var(--foreground)]"
          >
            Unduh CSV laporan
          </Link>
        }
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {alerts.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-[var(--line)] px-4 py-6 text-sm text-[var(--ink-soft)]">
              Tidak ada perhatian khusus pada cakupan ini.
            </div>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert.title}
                className="rounded-[24px] border border-[var(--line)] bg-white/80 p-4"
              >
                <StatusBadge
                  status={alert.status}
                  label={
                    alert.status === "pending"
                      ? transactionStatusLabel("pending")
                      : alert.status === "active"
                        ? voucherStatusLabel("active")
                        : distributionStatusLabel("rerouted")
                  }
                />
                <p className="mt-3 font-semibold text-[var(--foreground)]">{alert.title}</p>
                <p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">
                  {alert.body}
                </p>
              </div>
            ))
          )}
        </div>
      </Panel>

      <Panel
        title="Ringkasan per merchant"
        description="Pantau kontribusi merchant terhadap sponsor, penyaluran, dan pembayaran yang belum selesai."
      >
        <div className="overflow-hidden rounded-[28px] border border-[var(--line)]">
          <table className="min-w-full divide-y divide-[var(--line)] bg-white/80 text-sm">
            <thead className="bg-[rgba(19,35,29,0.03)] text-left text-[var(--ink-soft)]">
              <tr>
                <th className="px-4 py-3 font-semibold">Merchant</th>
                <th className="px-4 py-3 font-semibold">Porsi tersalurkan</th>
                <th className="px-4 py-3 font-semibold">Porsi sponsor</th>
                <th className="px-4 py-3 font-semibold">Dana lunas</th>
                <th className="px-4 py-3 font-semibold">Pending</th>
              </tr>
            </thead>
            <tbody>
              {merchantRows.map((row) => (
                <tr key={row.merchant.id} className="border-t border-[var(--line)]">
                  <td className="px-4 py-4">
                    <p className="font-semibold text-[var(--foreground)]">{row.merchant.name}</p>
                    <p className="mt-1 text-xs text-[var(--ink-soft)]">{row.merchant.area}</p>
                  </td>
                  <td className="px-4 py-4 font-semibold text-[var(--foreground)]">
                    {formatNumber(row.distributed)}
                  </td>
                  <td className="px-4 py-4 text-[var(--ink-soft)]">
                    {formatNumber(row.totalSponsored)}
                  </td>
                  <td className="px-4 py-4 font-semibold text-[var(--foreground)]">
                    {formatCurrency(row.settledAmount)}
                  </td>
                  <td className="px-4 py-4 text-[var(--ink-soft)]">
                    {formatNumber(row.pendingInvoices)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel
        title="Ringkasan per lokasi penyaluran"
        description="Cek performa lokasi untuk verifikasi, pengalihan, dan dokumentasi lapangan."
      >
        <div className="overflow-hidden rounded-[28px] border border-[var(--line)]">
          <table className="min-w-full divide-y divide-[var(--line)] bg-white/80 text-sm">
            <thead className="bg-[rgba(19,35,29,0.03)] text-left text-[var(--ink-soft)]">
              <tr>
                <th className="px-4 py-3 font-semibold">Lokasi</th>
                <th className="px-4 py-3 font-semibold">Selesai</th>
                <th className="px-4 py-3 font-semibold">Terverifikasi</th>
                <th className="px-4 py-3 font-semibold">Dialihkan</th>
                <th className="px-4 py-3 font-semibold">Dokumentasi</th>
              </tr>
            </thead>
            <tbody>
              {nodeRows.map((row) => (
                <tr key={row.node.id} className="border-t border-[var(--line)]">
                  <td className="px-4 py-4">
                    <p className="font-semibold text-[var(--foreground)]">{row.node.name}</p>
                    <p className="mt-1 text-xs text-[var(--ink-soft)]">{row.node.area}</p>
                  </td>
                  <td className="px-4 py-4 font-semibold text-[var(--foreground)]">
                    {formatNumber(row.completed)}
                  </td>
                  <td className="px-4 py-4 text-[var(--ink-soft)]">
                    {formatNumber(row.verified)}
                  </td>
                  <td className="px-4 py-4 text-[var(--ink-soft)]">
                    {formatNumber(row.rerouted)}
                  </td>
                  <td className="px-4 py-4 font-semibold text-[var(--foreground)]">
                    {formatNumber(row.proofs)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
