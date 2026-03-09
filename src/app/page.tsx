import {
  ArrowRight,
  Building2,
  HandCoins,
  HeartHandshake,
  QrCode,
  Smartphone,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { SponsorForm } from "@/components/landing/sponsor-form";
import { MetricCard } from "@/components/shared/metric-card";
import { Panel } from "@/components/shared/panel";
import { StatusBadge } from "@/components/shared/status-badge";
import { getLandingSnapshot } from "@/lib/domain";
import { isMayarConfigured } from "@/lib/mayar";
import {
  formatCurrency,
  formatNumber,
  formatTimeRange,
  portionStatusLabel,
} from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Home() {
  const snapshot = await getLandingSnapshot();
  const mayarLive = isMayarConfigured();
  const merchantById = new Map(
    snapshot.merchants.map((merchant) => [merchant.id, merchant]),
  );
  const sponsorOptions = snapshot.activePortions.map((portion) => ({
    id: portion.id,
    title: portion.title,
    area: merchantById.get(portion.merchantId)?.area ?? "Jakarta",
    sponsorPrice: portion.sponsorPrice,
    availablePortions: portion.availablePortions,
  }));

  return (
    <main className="pb-20">
      <section className="mx-auto max-w-[1400px] px-4 pt-4 lg:px-6">
        <div className="glass-panel rounded-[32px] px-6 py-5 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.34em] text-[var(--ink-soft)]">
                Iftar Relay
              </p>
              <h1 className="display-font mt-2 text-2xl font-black tracking-tight text-[var(--foreground)]">
                bantuan makan Ramadan yang cepat, jelas, dan langsung terasa
              </h1>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/login"
                className="rounded-full border border-[var(--line)] bg-white px-5 py-3 text-sm font-semibold text-[var(--foreground)] hover:-translate-y-0.5"
              >
                Masuk pengelola
              </Link>
              <Link
                href="#sponsor"
                className="inline-flex items-center gap-2 rounded-full bg-[var(--brand)] px-5 py-3 text-sm font-semibold text-white hover:-translate-y-0.5 hover:bg-[var(--brand-strong)]"
              >
                Bantu sekarang
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-6 grid max-w-[1400px] gap-6 px-4 lg:grid-cols-[1.08fr_0.92fr] lg:px-6">
        <div className="surface-card-strong rounded-[40px] p-8 lg:p-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-800">
            <HeartHandshake className="h-4 w-4" />
            Menghubungkan UMKM, donatur, dan penyaluran
          </div>
          <h2 className="display-font mt-6 max-w-3xl text-5xl font-black tracking-tight text-[var(--foreground)] lg:text-6xl">
            Satu tempat untuk membantu paket buka puasa dari UMKM lokal sampai ke penerima.
          </h2>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--ink-soft)]">
            Iftar Relay membantu donatur memilih paket makanan yang tersedia,
            membayar dengan aman, lalu memantau penyaluran bersama merchant,
            relawan, dan komunitas sekitar dengan catatan yang rapi.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 text-sm">
            <span className="rounded-full border border-[var(--line)] bg-white px-4 py-2 font-semibold text-[var(--foreground)]">
              Dashboard pengelola
            </span>
            <span className="rounded-full border border-[var(--line)] bg-white px-4 py-2 font-semibold text-[var(--foreground)]">
              Tampilan seluler relawan
            </span>
            <span className="rounded-full border border-[var(--line)] bg-white px-4 py-2 font-semibold text-[var(--foreground)]">
              Voucher digital
            </span>
            <span className="rounded-full border border-[var(--line)] bg-white px-4 py-2 font-semibold text-[var(--foreground)]">
              Pembayaran Mayar.id
            </span>
          </div>

          <div className="mt-10 overflow-hidden rounded-[32px] border border-[var(--line)] bg-white/70">
            <Image
              src="/images/hero.png"
              alt="Iftar Relay hero"
              width={1600}
              height={920}
              className="h-[280px] w-full object-cover"
              priority
            />
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2">
            <MetricCard
              title="Porsi tersalurkan"
              value={formatNumber(snapshot.metrics.distributedPortions)}
              caption="Paket yang sudah diterima dan tercatat melalui pembayaran serta verifikasi lapangan."
              icon={HeartHandshake}
              accent="emerald"
            />
            <MetricCard
              title="Merchant aktif"
              value={formatNumber(snapshot.metrics.activeMerchants)}
              caption="UMKM yang siap menyalurkan paket makanan dan dipantau sepanjang hari."
              icon={Building2}
              accent="sky"
            />
            <MetricCard
              title="Donatur aktif"
              value={formatNumber(snapshot.metrics.activeDonors)}
              caption="Donatur yang bantuannya sudah tercatat dan bisa ditelusuri."
              icon={HandCoins}
              accent="amber"
            />
            <MetricCard
              title="Dana terkumpul"
              value={formatCurrency(snapshot.metrics.mayarSettled)}
              caption={
                mayarLive
                  ? "Total pembayaran yang sudah diterima melalui Mayar.id."
                  : "Total pembayaran yang tercatat pada mode simulasi Mayar.id."
              }
              icon={QrCode}
              accent="rose"
            />
          </div>
        </div>

        <div id="sponsor">
          <SponsorForm portions={sponsorOptions} />
        </div>
      </section>

      <section className="mx-auto mt-6 grid max-w-[1400px] gap-6 px-4 lg:grid-cols-[1.05fr_0.95fr] lg:px-6">
        <Panel
          title="Pilihan bantuan yang siap didukung"
          description="Paket makanan yang masih tersedia dan bisa langsung dibantu hari ini."
        >
          <div className="grid gap-4">
            {snapshot.activePortions.slice(0, 4).map((portion) => {
              const merchant = merchantById.get(portion.merchantId);

              return (
                <article
                  key={portion.id}
                  className="overflow-hidden rounded-[28px] border border-[var(--line)] bg-white/80"
                >
                  <div className="grid gap-4 p-5 md:grid-cols-[0.85fr_1.15fr]">
                    <div className="overflow-hidden rounded-[24px] border border-[var(--line)]">
                      <Image
                        src={portion.imageUrl ?? "/images/food-package.png"}
                        alt={portion.title}
                        width={960}
                        height={720}
                        className="h-full min-h-52 w-full object-cover"
                      />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <p className="display-font text-xl font-bold text-[var(--foreground)]">
                            {portion.title}
                          </p>
                          <p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">
                            {portion.description}
                          </p>
                        </div>
                        <StatusBadge
                          status={portion.status}
                          label={portionStatusLabel(portion.status)}
                        />
                      </div>
                      <div className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
                        <div>
                          <p className="text-[var(--ink-soft)]">Merchant</p>
                          <p className="mt-1 font-semibold text-[var(--foreground)]">
                            {merchant?.name}
                          </p>
                        </div>
                        <div>
                          <p className="text-[var(--ink-soft)]">Waktu pengambilan</p>
                          <p className="mt-1 font-semibold text-[var(--foreground)]">
                            {formatTimeRange(portion.pickupStartAt, portion.pickupEndAt)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[var(--ink-soft)]">Biaya per paket</p>
                          <p className="mt-1 font-semibold text-[var(--foreground)]">
                            {formatCurrency(portion.sponsorPrice)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </Panel>

        <Panel
          title="Cara kerjanya"
          description="Alur sederhana yang mempertemukan bantuan, pembayaran, dan penyaluran di satu tempat."
        >
          <div className="grid gap-4">
            {[
              {
                title: "1. Merchant menyiapkan paket",
                body: "Merchant menambahkan jumlah paket, waktu pengambilan, dan lokasi penyaluran yang paling sesuai.",
              },
              {
                title: "2. Donatur menyelesaikan pembayaran",
                body: "Donatur membayar melalui Mayar.id. Setelah pembayaran diterima, voucher penyaluran langsung aktif.",
              },
              {
                title: "3. Penyaluran diverifikasi",
                body: "Relawan memindai voucher, mengunggah dokumentasi, lalu sistem memperbarui status bantuan secara otomatis.",
              },
            ].map((step) => (
              <div
                key={step.title}
                className="rounded-[28px] border border-[var(--line)] bg-white/80 p-5"
              >
                <p className="display-font text-lg font-bold text-[var(--foreground)]">
                  {step.title}
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <section className="mx-auto mt-6 grid max-w-[1400px] gap-6 px-4 lg:grid-cols-2 lg:px-6">
        <Panel
          title="Dashboard pengelola"
          description="Untuk pengelola program, merchant, dan mitra komunitas."
        >
          <div className="rounded-[30px] bg-[linear-gradient(180deg,#153d33,#102822)] p-6 text-white">
            <div className="grid gap-4 md:grid-cols-[1.05fr_0.95fr]">
              <div className="overflow-hidden rounded-[24px] border border-white/10">
                <Image
                  src="/images/dashboard.png"
                  alt="Dashboard Iftar Relay"
                  width={1280}
                  height={840}
                  className="h-full min-h-56 w-full object-cover"
                />
              </div>
              <div className="grid gap-4">
              <div className="rounded-[24px] border border-white/10 bg-white/10 p-5">
                <p className="text-sm text-white/70">Modul utama</p>
                <ul className="mt-3 space-y-2 text-sm text-white/90">
                  <li>Ringkasan bantuan dan penyaluran</li>
                  <li>Merchant, voucher, pembayaran, dan distribusi</li>
                  <li>Status pembayaran otomatis melalui Mayar</li>
                </ul>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/10 p-5">
                <p className="text-sm text-white/70">Output</p>
                <ul className="mt-3 space-y-2 text-sm text-white/90">
                  <li>Riwayat pembayaran yang mudah ditelusuri</li>
                  <li>Dokumentasi penyaluran di lapangan</li>
                  <li>Pemantauan status paket makanan</li>
                </ul>
              </div>
              </div>
            </div>
            <Link
              href="/dashboard"
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-[var(--brand-strong)]"
            >
              Buka dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Panel>

        <Panel
          title="Tampilan seluler untuk lapangan"
          description="Untuk merchant, relawan, dan petugas yang bergerak cepat menjelang berbuka."
        >
          <div className="rounded-[30px] bg-[linear-gradient(180deg,#fff8ea,#f4ead6)] p-6">
            <div className="grid gap-4 md:grid-cols-[0.95fr_1.05fr]">
              <div className="overflow-hidden rounded-[28px] border border-[var(--line)]">
                <Image
                  src="/images/qr-scan.png"
                  alt="QR scan mobile Iftar Relay"
                  width={1280}
                  height={960}
                  className="h-full min-h-64 w-full object-cover"
                />
              </div>
              <div className="space-y-3">
                <div className="rounded-[24px] border border-[var(--line)] bg-[var(--foreground)] p-4 text-white">
                  <Smartphone className="h-6 w-6" />
                  <p className="mt-3 display-font text-2xl font-bold">
                    Periksa voucher, perbarui tugas, dan unggah dokumentasi.
                  </p>
                </div>
                <div className="rounded-[24px] border border-[var(--line)] bg-white/80 p-4">
                  Tambah paket baru dan atur waktu pengambilan
                </div>
                <div className="rounded-[24px] border border-[var(--line)] bg-white/80 p-4">
                  Pindai atau ketik kode voucher secara manual
                </div>
                <div className="rounded-[24px] border border-[var(--line)] bg-white/80 p-4">
                  Unggah dokumentasi penyaluran untuk laporan
                </div>
              </div>
            </div>
            <Link
              href="/mobile"
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-[var(--foreground)] px-5 py-3 text-sm font-semibold text-white"
            >
              Lihat tampilan seluler
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Panel>
      </section>

      <section className="mx-auto mt-6 max-w-[1400px] px-4 lg:px-6">
        <Panel
          title="Aktivitas terbaru"
          description="Perkembangan pembayaran, voucher, dan penyaluran yang baru saja terjadi."
        >
          <div className="grid gap-4 lg:grid-cols-2">
            {snapshot.recentLogs.map((log) => (
              <article
                key={log.id}
                className="rounded-[28px] border border-[var(--line)] bg-white/80 p-5"
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
              </article>
            ))}
          </div>
        </Panel>
      </section>
    </main>
  );
}
