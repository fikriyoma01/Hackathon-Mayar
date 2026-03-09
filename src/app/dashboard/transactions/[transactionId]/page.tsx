import { CreditCard, ExternalLink, ReceiptText } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { MayarPaymentControls } from "@/components/payments/mayar-payment-controls";
import { Panel } from "@/components/shared/panel";
import { QrGrid } from "@/components/shared/qr-grid";
import { StatusBadge } from "@/components/shared/status-badge";
import { requireSessionUser } from "@/lib/auth";
import { getTransactionDetail } from "@/lib/domain";
import { isMayarConfigured } from "@/lib/mayar";
import {
  formatCurrency,
  formatDateTime,
  transactionStatusLabel,
  voucherStatusLabel,
} from "@/lib/format";

export default async function TransactionDetailPage({
  params,
}: {
  params: Promise<{ transactionId: string }>;
}) {
  const user = await requireSessionUser();
  const { transactionId } = await params;
  const detail = await getTransactionDetail(user.id, transactionId);
  const integrationMode = isMayarConfigured() ? "direct" : "mock";

  if (!detail) {
    notFound();
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <Panel
        title="Detail transaksi"
        description="Ringkasan pembayaran sponsor dan pembaruan statusnya."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-[24px] border border-[var(--line)] bg-white/80 p-5">
            <p className="text-sm text-[var(--ink-soft)]">Donatur</p>
            <p className="mt-2 text-xl font-bold text-[var(--foreground)]">
              {detail.transaction.donorName}
            </p>
            <p className="mt-1 text-sm text-[var(--ink-soft)]">
              {detail.transaction.donorEmail}
            </p>
            <p className="mt-1 text-sm text-[var(--ink-soft)]">
              {detail.transaction.donorPhone}
            </p>
          </div>
          <div className="rounded-[24px] border border-[var(--line)] bg-white/80 p-5">
            <p className="text-sm text-[var(--ink-soft)]">Status pembayaran</p>
            <div className="mt-3">
              <StatusBadge
                status={detail.transaction.status}
                label={transactionStatusLabel(detail.transaction.status)}
              />
            </div>
            <p className="mt-3 text-sm text-[var(--ink-soft)]">
              Dibuat {formatDateTime(detail.transaction.createdAt)}
            </p>
          </div>
          <div className="rounded-[24px] border border-[var(--line)] bg-white/80 p-5">
            <p className="text-sm text-[var(--ink-soft)]">Nominal</p>
            <p className="mt-2 text-2xl font-black text-[var(--foreground)]">
              {formatCurrency(detail.transaction.amount)}
            </p>
          </div>
          <div className="rounded-[24px] border border-[var(--line)] bg-white/80 p-5">
            <p className="text-sm text-[var(--ink-soft)]">Paket bantuan</p>
            <p className="mt-2 text-lg font-bold text-[var(--foreground)]">
              {detail.portion?.title ?? "-"}
            </p>
            <p className="mt-1 text-sm text-[var(--ink-soft)]">
              {detail.transaction.sponsoredPortions} porsi
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-[28px] border border-[var(--line)] bg-white/80 p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-[var(--ink-soft)]">Kode pembayaran Mayar</p>
              <p className="mt-2 text-lg font-bold text-[var(--foreground)]">
                {detail.transaction.mayarInvoiceId}
              </p>
              <p className="mt-2 text-sm text-[var(--ink-soft)]">
                Referensi transaksi{" "}
                {detail.transaction.mayarTransactionId ?? "akan terisi setelah pembayaran diproses"}
              </p>
            </div>
            <a
              href={detail.transaction.mayarPaymentUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold text-[var(--foreground)]"
            >
              {integrationMode === "direct"
                ? "Buka halaman pembayaran"
                : "Buka halaman pembayaran simulasi"}
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-[24px] bg-[rgba(19,35,29,0.04)] p-4">
              <p className="text-sm text-[var(--ink-soft)]">Metode tercatat</p>
              <p className="mt-2 font-semibold text-[var(--foreground)]">
                {detail.transaction.paymentChannel}
              </p>
            </div>
            <div className="rounded-[24px] bg-[rgba(19,35,29,0.04)] p-4">
              <p className="text-sm text-[var(--ink-soft)]">Dibayar pada</p>
              <p className="mt-2 font-semibold text-[var(--foreground)]">
                {detail.transaction.paidAt
                  ? formatDateTime(detail.transaction.paidAt)
                  : "Menunggu pembayaran"}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <MayarPaymentControls
              transactionId={detail.transaction.id}
              status={detail.transaction.status}
              voucherCode={detail.voucher?.code}
              integrationMode={integrationMode}
              paymentUrl={detail.transaction.mayarPaymentUrl}
            />
          </div>
        </div>

        {detail.voucher ? (
          <div className="mt-6 rounded-[28px] border border-[var(--line)] bg-white/80 p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm text-[var(--ink-soft)]">Voucher dari pembayaran ini</p>
                <p className="mt-2 text-lg font-bold text-[var(--foreground)]">
                  {detail.voucher.code}
                </p>
              </div>
              <StatusBadge
                status={detail.voucher.status}
                label={voucherStatusLabel(detail.voucher.status)}
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href={`/voucher/${detail.voucher.code}`}
                className="inline-flex items-center gap-2 rounded-full bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white"
              >
                Buka voucher publik
                <ExternalLink className="h-4 w-4" />
              </Link>
              {detail.distribution ? (
                <Link
                  href={`/dashboard/distribution/${detail.distribution.id}`}
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold text-[var(--foreground)]"
                >
                  Detail penyaluran
                  <ReceiptText className="h-4 w-4" />
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}
      </Panel>

      <Panel
        title="Ringkasan pembayaran"
        description={
          integrationMode === "direct"
            ? "QR dan status pembayaran langsung dari Mayar.id."
            : "QR dan tautan pembayaran pada mode simulasi Mayar.id."
        }
      >
        <div className="grid gap-5">
          <div className="rounded-[28px] bg-[linear-gradient(180deg,#153d33,#102822)] p-6 text-white">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-white/10 p-3">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-white/65">Pembayaran Mayar.id</p>
                <p className="display-font text-2xl font-bold">
                  {detail.transaction.mayarInvoiceId}
                </p>
              </div>
            </div>
            <p className="mt-4 text-sm text-white/70">
              {integrationMode === "direct"
                ? "QR dan tautan ini berasal dari pembayaran Mayar yang tersimpan pada transaksi."
                : "QR simulasi ini dipakai untuk memperlihatkan alur pembayaran bantuan."}
            </p>
          </div>
          <QrGrid value={detail.transaction.mayarQrString} />
        </div>
      </Panel>
    </div>
  );
}
