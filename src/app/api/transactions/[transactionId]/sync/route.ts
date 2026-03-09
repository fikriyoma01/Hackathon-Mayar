import { NextResponse } from "next/server";

import { syncTransactionWithMayar } from "@/lib/domain";

export async function POST(
  _request: Request,
  context: { params: Promise<{ transactionId: string }> },
) {
  try {
    const { transactionId } = await context.params;
    const transaction = await syncTransactionWithMayar(transactionId);

    return NextResponse.json({
      transactionId: transaction.id,
      status: transaction.status,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Gagal sinkron ke Mayar.",
      },
      { status: 400 },
    );
  }
}
