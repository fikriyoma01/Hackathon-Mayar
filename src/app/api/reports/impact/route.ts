import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { getDashboardSnapshot } from "@/lib/domain";

function escapeCsv(value: string | number | null | undefined) {
  const text = String(value ?? "");
  if (text.includes(",") || text.includes("\"") || text.includes("\n")) {
    return `"${text.replace(/"/g, "\"\"")}"`;
  }
  return text;
}

export async function GET() {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "Belum login." }, { status: 401 });
  }

  const snapshot = await getDashboardSnapshot(user.id);
  const portionById = new Map(snapshot.portions.map((portion) => [portion.id, portion]));
  const merchantById = new Map(snapshot.merchants.map((merchant) => [merchant.id, merchant]));
  const voucherById = new Map(snapshot.vouchers.map((voucher) => [voucher.id, voucher]));
  const distributionByVoucherId = new Map(
    snapshot.distributions
      .filter((activity) => activity.voucherId)
      .map((activity) => [activity.voucherId as string, activity]),
  );

  const rows = [
    [
      "transaction_id",
      "invoice_id",
      "donor_name",
      "donor_email",
      "donor_phone",
      "merchant_name",
      "portion_title",
      "sponsored_portions",
      "amount",
      "transaction_status",
      "paid_at",
      "voucher_code",
      "voucher_status",
      "distribution_status",
      "proof_uploaded",
    ].join(","),
    ...snapshot.transactions.map((transaction) => {
      const portion = portionById.get(transaction.portionId);
      const merchant = portion ? merchantById.get(portion.merchantId) : null;
      const voucher = transaction.voucherId ? voucherById.get(transaction.voucherId) : null;
      const distribution = voucher ? distributionByVoucherId.get(voucher.id) : null;

      return [
        escapeCsv(transaction.id),
        escapeCsv(transaction.mayarInvoiceId),
        escapeCsv(transaction.donorName),
        escapeCsv(transaction.donorEmail),
        escapeCsv(transaction.donorPhone),
        escapeCsv(merchant?.name),
        escapeCsv(portion?.title),
        escapeCsv(transaction.sponsoredPortions),
        escapeCsv(transaction.amount),
        escapeCsv(transaction.status),
        escapeCsv(transaction.paidAt ?? ""),
        escapeCsv(voucher?.code ?? ""),
        escapeCsv(voucher?.status ?? ""),
        escapeCsv(distribution?.status ?? ""),
        escapeCsv(distribution?.proofImageUrl ? "yes" : "no"),
      ].join(",");
    }),
  ].join("\n");

  return new NextResponse(rows, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="iftar-relay-impact.csv"',
    },
  });
}
