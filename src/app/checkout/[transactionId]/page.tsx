import { ArrowLeft, BadgeCheck, Cable, CreditCard, Webhook } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { MayarPaymentControls } from "@/components/payments/mayar-payment-controls";
import { QrGrid } from "@/components/shared/qr-grid";
import { StatusBadge } from "@/components/shared/status-badge";
import { getHydratedStore } from "@/lib/domain";
import { isMayarConfigured } from "@/lib/mayar";
import {
  formatCurrency,
  formatDateTime,
  transactionStatusLabel,
} from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ transactionId: string }>;
}) {
  const { transactionId } = await params;
  const store = await getHydratedStore();
  const transaction = store.transactions.find((item) => item.id === transactionId);

  if (!transaction) {
    notFound();
  }

  const portion = store.portions.find((item) => item.id === transaction.portionId);
  const voucher = transaction.voucherId
    ? store.vouchers.find((item) => item.id === transaction.voucherId)
    : null;
  const integrationMode = isMayarConfigured() ? "direct" : "mock";
  const hasNativeQrisPayload =
    transaction.mayarQrString.trim().startsWith("000201") &&
    transaction.mayarQrString.trim().length >= 40;
  const checkoutTitle =
    integrationMode === "direct" ? "Pembayaran Mayar" : "Pembayaran simulasi";
  const paymentLinkLabel =
    integrationMode === "direct"
      ? "Tautan pembayaran siap digunakan"
      : "Tautan pembayaran simulasi siap digunakan";

  return (
    <main className="mx-auto max-w-[1200px] px-4 py-8 lg:px-6">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--brand)]"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke beranda
      </Link>

      <div className="mt-5 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="surface-card-strong rounded-[36px] p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-[var(--ink-soft)]">
                Pembayaran bantuan
              </p>
              <h1 className="display-font mt-3 text-4xl font-black tracking-tight text-[var(--foreground)]">
                Selesaikan pembayaran bantuan Anda.
              </h1>
            </div>
            <StatusBadge
              status={transaction.status}
              label={transactionStatusLabel(transaction.status)}
            />
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-[28px] border border-[var(--line)] bg-white/80 p-5">
              <p className="text-sm text-[var(--ink-soft)]">Kode pembayaran</p>
              <p className="mt-2 text-xl font-bold text-[var(--foreground)]">
                {transaction.mayarInvoiceId}
              </p>
            </div>
            <div className="rounded-[28px] border border-[var(--line)] bg-white/80 p-5">
              <p className="text-sm text-[var(--ink-soft)]">Total pembayaran</p>
              <p className="mt-2 text-2xl font-black text-[var(--foreground)]">
                {formatCurrency(transaction.amount)}
              </p>
            </div>
            <div className="rounded-[28px] border border-[var(--line)] bg-white/80 p-5">
              <p className="text-sm text-[var(--ink-soft)]">Paket yang dibantu</p>
              <p className="mt-2 font-semibold text-[var(--foreground)]">
                {portion?.title ?? "-"}
              </p>
              <p className="mt-1 text-sm text-[var(--ink-soft)]">
                {transaction.sponsoredPortions} porsi
              </p>
            </div>
            <div className="rounded-[28px] border border-[var(--line)] bg-white/80 p-5">
              <p className="text-sm text-[var(--ink-soft)]">Batas pembayaran</p>
              <p className="mt-2 font-semibold text-[var(--foreground)]">
                {formatDateTime(transaction.expiresAt)}
              </p>
            </div>
          </div>

          <div className="mt-8 rounded-[30px] bg-[linear-gradient(180deg,#153d33,#102822)] p-6 text-white">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-white/10 p-3">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-white/70">Pembayaran bantuan</p>
                <p className="mt-2 display-font text-2xl font-bold">
                  Scan QR atau buka tautan pembayaran. Setelah dana diterima, voucher penyaluran akan aktif otomatis.
                </p>
              </div>
            </div>
          </div>
          <div className="mt-6 overflow-hidden rounded-[28px] border border-[var(--line)] bg-white/70">
            <Image
              src={portion?.imageUrl ?? "/images/payment-methods.png"}
              alt={portion?.title ?? "Checkout sponsor"}
              width={1400}
              height={860}
              className="h-56 w-full object-cover"
            />
          </div>
        </section>

        <section className="surface-card rounded-[36px] p-8">
          <p className="text-sm uppercase tracking-[0.24em] text-[var(--ink-soft)]">
            {checkoutTitle}
          </p>
          <div className="mt-5 grid gap-5">
            {integrationMode === "direct" ? (
              hasNativeQrisPayload ? (
                <QrGrid value={transaction.mayarQrString} />
              ) : (
                <div className="overflow-hidden rounded-[28px] border border-[var(--line)] bg-white">
                  <div className="border-b border-[var(--line)] bg-[rgba(19,35,29,0.03)] p-4">
                    <p className="font-semibold text-[var(--foreground)]">
                      QRIS resmi dari checkout Mayar
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">
                      API invoice Mayar tidak mengirim payload QRIS mentah ke aplikasi ini, jadi QR resmi ditampilkan langsung dari halaman checkout Mayar agar dapat dipindai oleh device nyata.
                    </p>
                  </div>
                  <iframe
                    src={transaction.mayarPaymentUrl}
                    title={`Checkout Mayar ${transaction.mayarInvoiceId}`}
                    className="h-[720px] w-full bg-white"
                    loading="lazy"
                    referrerPolicy="strict-origin-when-cross-origin"
                  />
                </div>
              )
            ) : (
              <QrGrid value={transaction.mayarQrString} />
            )}
            <div className="rounded-[24px] border border-[var(--line)] bg-white/80 p-4">
              <div className="flex items-center gap-3">
                <BadgeCheck className="h-5 w-5 text-emerald-700" />
                <div>
                  <p className="font-semibold text-[var(--foreground)]">{paymentLinkLabel}</p>
                  <p className="mt-1 break-all text-sm text-[var(--ink-soft)]">
                    {transaction.mayarPaymentUrl}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-[24px] border border-[var(--line)] bg-white/80 p-4">
              <div className="flex items-center gap-3">
                <Webhook className="h-5 w-5 text-sky-700" />
                <div>
                  <p className="font-semibold text-[var(--foreground)]">Konfirmasi otomatis</p>
                  <p className="mt-1 text-sm text-[var(--ink-soft)]">
                    Setelah pembayaran diterima, status bantuan, voucher, dan penyaluran akan diperbarui otomatis.
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-[24px] border border-[var(--line)] bg-white/80 p-4">
              <div className="flex items-center gap-3">
                <Cable className="h-5 w-5 text-amber-700" />
                <div>
                  <p className="font-semibold text-[var(--foreground)]">Status pembaruan</p>
                  <p className="mt-1 text-sm text-[var(--ink-soft)]">
                    {integrationMode === "direct"
                      ? "Pembayaran dipantau otomatis. Setelah lunas, transaksi dan penyaluran akan langsung diperbarui."
                      : "Pada mode simulasi, pembayaran dapat ditandai berhasil untuk memperlihatkan alur bantuan secara utuh."}
                  </p>
                </div>
              </div>
            </div>

            <MayarPaymentControls
              transactionId={transaction.id}
              status={transaction.status}
              voucherCode={voucher?.code}
              integrationMode={integrationMode}
              paymentUrl={transaction.mayarPaymentUrl}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
