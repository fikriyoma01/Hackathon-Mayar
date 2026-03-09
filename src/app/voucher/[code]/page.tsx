import { CheckCircle2, Clock3, MapPinned, UserRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { QrGrid } from "@/components/shared/qr-grid";
import { StatusBadge } from "@/components/shared/status-badge";
import { getVoucherDetail } from "@/lib/domain";
import { formatDateTime, voucherStatusLabel } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function VoucherPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const detail = await getVoucherDetail(code);

  if (!detail) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-[1100px] px-4 py-8 lg:px-6">
      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="surface-card-strong rounded-[36px] p-8">
          <p className="text-sm uppercase tracking-[0.24em] text-[var(--ink-soft)]">
            Voucher bantuan makanan
          </p>
          <h1 className="display-font mt-4 text-4xl font-black tracking-tight text-[var(--foreground)]">
            {detail.voucher.code}
          </h1>
          <div className="mt-5">
            <StatusBadge
              status={detail.voucher.status}
              label={voucherStatusLabel(detail.voucher.status)}
            />
          </div>
          <div className="mt-6">
            <QrGrid value={detail.voucher.qrPayload} />
          </div>
          <div className="mt-5 overflow-hidden rounded-[28px] border border-[var(--line)] bg-white/70">
            <Image
              src={detail.voucher.imageUrl ?? "/images/digital-voucher.png"}
              alt={detail.voucher.code}
              width={1200}
              height={860}
              className="h-48 w-full object-cover"
            />
          </div>
          <p className="mt-5 text-sm leading-7 text-[var(--ink-soft)]">
            Tunjukkan kode atau QR ini saat paket diterima. Voucher membantu proses
            penyaluran tetap aman, nyaman, dan mudah dicatat.
          </p>
        </section>

        <section className="surface-card rounded-[36px] p-8">
          <div className="grid gap-4">
            <div className="rounded-[26px] border border-[var(--line)] bg-white/80 p-5">
              <div className="flex items-center gap-3">
                <UserRound className="h-5 w-5 text-emerald-700" />
                <div>
                  <p className="text-sm text-[var(--ink-soft)]">Penerima</p>
                  <p className="mt-1 font-semibold text-[var(--foreground)]">
                    {detail.voucher.recipientAlias}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-[26px] border border-[var(--line)] bg-white/80 p-5">
              <div className="flex items-center gap-3">
                <MapPinned className="h-5 w-5 text-sky-700" />
                <div>
                  <p className="text-sm text-[var(--ink-soft)]">Lokasi pengambilan dan penyaluran</p>
                  <p className="mt-1 font-semibold text-[var(--foreground)]">
                    {`${detail.merchant?.name ?? "-"} | ${detail.node?.name ?? "-"}`}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-[26px] border border-[var(--line)] bg-white/80 p-5">
              <div className="flex items-center gap-3">
                <Clock3 className="h-5 w-5 text-amber-700" />
                <div>
                  <p className="text-sm text-[var(--ink-soft)]">Batas tebus</p>
                  <p className="mt-1 font-semibold text-[var(--foreground)]">
                    {formatDateTime(detail.voucher.expiresAt)}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-[26px] border border-[var(--line)] bg-white/80 p-5">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-teal-700" />
                <div>
                  <p className="text-sm text-[var(--ink-soft)]">Catatan penyaluran</p>
                  <p className="mt-1 font-semibold text-[var(--foreground)]">
                    {detail.distribution?.note ?? "Menunggu voucher digunakan"}
                  </p>
                </div>
              </div>
            </div>
            <Link
              href="/login"
              className="inline-flex justify-center rounded-full bg-[var(--brand)] px-5 py-3 text-sm font-semibold text-white"
            >
              Masuk ke dashboard pengelola
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
