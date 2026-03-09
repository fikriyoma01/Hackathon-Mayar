import { NextResponse } from "next/server";
import { z } from "zod";

import { getHydratedStore, settleTransactionPaymentByInvoice } from "@/lib/domain";

const paySchema = z.object({
  paymentMethod: z
    .enum(["QRIS Mayar", "Virtual Account", "Payment Link"])
    .optional(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ transactionId: string }> },
) {
  try {
    const { transactionId } = await context.params;
    const payload = paySchema.parse(await request.json().catch(() => ({})));
    const store = await getHydratedStore();
    const transaction = store.transactions.find((item) => item.id === transactionId);

    if (!transaction) {
      return NextResponse.json(
        { error: "Transaksi tidak ditemukan." },
        { status: 404 },
      );
    }

    const updated = await settleTransactionPaymentByInvoice(
      transaction.mayarInvoiceId,
      {
        paymentMethod: payload.paymentMethod,
        mayarTransactionId: transaction.mayarTransactionId,
      },
    );

    return NextResponse.json({
      transactionId: updated.id,
      status: updated.status,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof z.ZodError
            ? "Payload pembayaran tidak valid."
            : error instanceof Error
              ? error.message
              : "Gagal memproses pembayaran mock.",
      },
      { status: 400 },
    );
  }
}
