import { NextResponse } from "next/server";
import { z } from "zod";

import { createSponsorTransaction } from "@/lib/domain";

const transactionSchema = z.object({
  portionId: z.string().min(1),
  donorName: z.string().min(2),
  donorEmail: z.string().email(),
  donorPhone: z.string().min(8),
  sponsoredPortions: z.coerce.number().int().min(1).max(100),
});

export async function POST(request: Request) {
  try {
    const payload = transactionSchema.parse(await request.json());
    const transaction = await createSponsorTransaction(payload);

    return NextResponse.json({
      transactionId: transaction.id,
      checkoutPath: transaction.checkoutPath,
      mayarInvoiceId: transaction.mayarInvoiceId,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof z.ZodError
            ? "Data sponsor tidak valid."
            : error instanceof Error
              ? error.message
              : "Gagal menyiapkan pembayaran.",
      },
      { status: 400 },
    );
  }
}
