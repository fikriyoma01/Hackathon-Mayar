import {
  Activity,
  Building2,
  HandCoins,
  Link2,
  Receipt,
  Route,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { ResetDemoButton } from "@/components/app/reset-demo-button";
import { MayarConnectionCard } from "@/components/dashboard/mayar-connection-card";
import { PortionStatusControl } from "@/components/dashboard/portion-status-control";
import { MetricCard } from "@/components/shared/metric-card";
import { Panel } from "@/components/shared/panel";
import { PriorityBadge } from "@/components/shared/priority-badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { requireSessionUser } from "@/lib/auth";
import { getDashboardSnapshot } from "@/lib/domain";
import {
  distributionStatusLabel,
  distributionPriorityLabel,
  formatCurrency,
  formatDateTime,
  formatNumber,
  portionStatusLabel,
  transactionStatusLabel,
} from "@/lib/format";

export default async function DashboardPage() {
  const user = await requireSessionUser();
  const snapshot = await getDashboardSnapshot(user.id);
  const canManagePortions = user.role === "admin" || user.role === "merchant";

  return (
    <>
      <section className="surface-card-strong rounded-[32px] p-6 lg:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--ink-soft)]">
              Ringkasan pengelolaan
            </p>
            <h1 className="display-font mt-3 text-4xl font-black tracking-tight text-[var(--foreground)]">
              Pantau bantuan, voucher, penyaluran, dan pembayaran Mayar dalam satu tempat.
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--ink-soft)]">
              Semua modul pada halaman ini terhubung ke data yang sama dengan beranda,
              halaman pembayaran, voucher publik, dan tampilan seluler.
            </p>
          </div>
          {user.role === "admin" ? <ResetDemoButton /> : null}
        </div>
        <div className="mt-6 overflow-hidden rounded-[28px] border border-[var(--line)] bg-white/70">
          <Image
            src="/images/banner.png"
            alt="Banner dashboard Iftar Relay"
            width={1600}
            height={720}
            className="h-[220px] w-full object-cover"
            priority
          />
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-4">
        <MetricCard
          title="Porsi tersalurkan"
          value={formatNumber(snapshot.metrics.distributedPortions)}
          caption="Total porsi yang sudah tervalidasi di lapangan."
          icon={Activity}
          accent="emerald"
        />
        <MetricCard
          title="Merchant aktif"
          value={formatNumber(snapshot.metrics.activeMerchants)}
          caption="Merchant yang saat ini tercakup dalam akun Anda."
          icon={Building2}
          accent="sky"
        />
        <MetricCard
          title="Donatur aktif"
          value={formatNumber(snapshot.metrics.activeDonors)}
          caption="Donatur dengan transaksi berstatus lunas."
          icon={HandCoins}
          accent="amber"
        />
        <MetricCard
          title="Dana melalui Mayar"
          value={formatCurrency(snapshot.metrics.mayarSettled)}
          caption="Total pembayaran yang sudah diterima melalui Mayar."
          icon={Receipt}
          accent="rose"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel
          title="Tugas lapangan hari ini"
          description="Daftar ini sama dengan yang terlihat di tampilan seluler."
        >
          <div className="space-y-4">
            {snapshot.openTasks.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-[var(--line)] px-4 py-6 text-sm text-[var(--ink-soft)]">
                Tidak ada tugas terbuka.
              </div>
            ) : (
              snapshot.openTasks.slice(0, 4).map((task) => (
                <div
                  key={task.id}
                  className="rounded-[24px] border border-[var(--line)] bg-white/80 p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-[var(--foreground)]">
                        {task.locationLabel}
                      </p>
                      <p className="mt-2 text-sm text-[var(--ink-soft)]">
                        Perlu ditangani sebelum {formatDateTime(task.taskDueAt)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <PriorityBadge
                        priority={task.priorityLevel ?? "normal"}
                        label={distributionPriorityLabel(task.priorityLevel ?? "normal")}
                      />
                      <StatusBadge
                        status={task.status}
                        label={distributionStatusLabel(task.status)}
                      />
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-[var(--ink-soft)]">
                    {task.note}
                  </p>
                  <Link
                    href={`/dashboard/distribution/${task.id}`}
                    className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--brand)]"
                  >
                    Buka detail tugas
                    <Link2 className="h-4 w-4" />
                  </Link>
                </div>
              ))
            )}
          </div>
        </Panel>

        <Panel
          title="Aktivitas terbaru"
          description="Perubahan pembayaran, penyaluran, dan verifikasi yang baru terjadi."
        >
          <div className="space-y-3">
            {snapshot.recentLogs.map((log) => (
              <div
                key={log.id}
                className="rounded-[24px] border border-[var(--line)] bg-white/80 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-[var(--foreground)]">{log.title}</p>
                    <p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">
                      {log.description}
                    </p>
                  </div>
                  <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700">
                    {log.actor}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel
          title="Paket makanan yang dipantau"
          description="Status paket dari tersedia, sudah didukung, sedang disalurkan, hingga selesai."
        >
          <div className="space-y-3">
            {snapshot.portions.slice(0, 6).map((portion) => (
              <article
                key={portion.id}
                className="overflow-hidden rounded-[24px] border border-[var(--line)] bg-white/80"
              >
                <div className="grid gap-4 p-4 md:grid-cols-[0.78fr_1.22fr]">
                  <div className="overflow-hidden rounded-[20px] border border-[var(--line)]">
                    <Image
                      src={portion.imageUrl ?? "/images/food-package.png"}
                      alt={portion.title}
                      width={720}
                      height={520}
                      className="h-full min-h-40 w-full object-cover"
                    />
                  </div>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-[var(--foreground)]">
                        {portion.title}
                      </p>
                      <p className="mt-2 text-sm text-[var(--ink-soft)]">
                        Sisa {portion.availablePortions} porsi / tersalurkan{" "}
                        {portion.distributedPortions}
                      </p>
                    </div>
                    <StatusBadge
                      status={portion.status}
                      label={portionStatusLabel(portion.status)}
                    />
                  </div>
                  {canManagePortions ? (
                    <div className="mt-4">
                      <PortionStatusControl
                        portionId={portion.id}
                        currentStatus={portion.status}
                        actorName={user.name}
                        actorRole={user.role}
                      />
                    </div>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </Panel>

        <Panel
          title="Dokumentasi terbaru"
          description="Foto penyaluran dan riwayat verifikasi dari lokasi lapangan."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {snapshot.recentProofs.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-[var(--line)] px-4 py-6 text-sm text-[var(--ink-soft)]">
                Belum ada bukti lapangan.
              </div>
            ) : (
              snapshot.recentProofs.map((proof) => (
                <Link
                  key={proof.id}
                  href={`/dashboard/distribution/${proof.id}`}
                  className="overflow-hidden rounded-[28px] border border-[var(--line)] bg-white/80"
                >
                  {proof.proofImageUrl ? (
                    <Image
                      src={proof.proofImageUrl}
                      alt={proof.locationLabel}
                      width={720}
                      height={420}
                      className="h-40 w-full object-cover"
                    />
                  ) : null}
                  <div className="p-4">
                    <p className="font-semibold text-[var(--foreground)]">
                      {proof.locationLabel}
                    </p>
                    <p className="mt-2 text-sm text-[var(--ink-soft)]">
                      {proof.note}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </Panel>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Panel
          title="Pembayaran terbaru"
          description="Riwayat pembayaran sponsor dan pembaruan status dari Mayar."
          action={
            <Link
              href="/dashboard/transactions"
              className="text-sm font-semibold text-[var(--brand)]"
            >
              Lihat semua
            </Link>
          }
        >
          <div className="overflow-hidden rounded-[26px] border border-[var(--line)]">
            <table className="min-w-full divide-y divide-[var(--line)] bg-white/80 text-sm">
              <thead className="bg-[rgba(19,35,29,0.03)] text-left text-[var(--ink-soft)]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Donatur</th>
                  <th className="px-4 py-3 font-semibold">Kode pembayaran</th>
                  <th className="px-4 py-3 font-semibold">Nominal</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.transactions.slice(0, 6).map((transaction) => (
                  <tr key={transaction.id} className="border-t border-[var(--line)]">
                    <td className="px-4 py-4">
                      <Link
                        href={`/dashboard/transactions/${transaction.id}`}
                        className="font-semibold text-[var(--foreground)]"
                      >
                        {transaction.donorName}
                      </Link>
                    </td>
                    <td className="px-4 py-4 text-[var(--ink-soft)]">
                      {transaction.mayarInvoiceId}
                    </td>
                    <td className="px-4 py-4 font-semibold text-[var(--foreground)]">
                      {formatCurrency(transaction.amount)}
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge
                        status={transaction.status}
                        label={transactionStatusLabel(transaction.status)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <div className="space-y-6">
          {user.role === "admin" ? <MayarConnectionCard /> : null}
          <Panel
            title="Lokasi penyaluran"
            description="Masjid dan komunitas yang menerima penyaluran bantuan."
          >
            <div className="space-y-3">
              {snapshot.nodes.map((node) => (
                <article
                  key={node.id}
                  className="rounded-[24px] border border-[var(--line)] bg-white/80 p-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-[var(--foreground)]">{node.name}</p>
                      <p className="mt-1 text-sm text-[var(--ink-soft)]">
                        {node.area} / {node.contactName}
                      </p>
                    </div>
                    <Route className="h-5 w-5 text-[var(--ink-soft)]" />
                  </div>
                </article>
              ))}
            </div>
          </Panel>
        </div>
      </section>
    </>
  );
}
