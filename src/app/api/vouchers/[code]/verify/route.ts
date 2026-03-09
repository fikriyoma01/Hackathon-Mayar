import { NextResponse } from "next/server";
import { z } from "zod";

import { getSessionUser } from "@/lib/auth";
import { verifyVoucherCode } from "@/lib/domain";

const verifySchema = z.object({
  actorName: z.string().min(2).optional(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ code: string }> },
) {
  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json({ error: "Belum login." }, { status: 401 });
    }

    const { code } = await context.params;
    const payload = verifySchema.parse(await request.json());
    const voucher = await verifyVoucherCode({
      code,
      actorName: payload.actorName ?? user.name,
    });

    return NextResponse.json({ voucherId: voucher.id });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof z.ZodError
            ? "Payload verifikasi tidak valid."
            : error instanceof Error
              ? error.message
              : "Voucher gagal diverifikasi.",
      },
      { status: 400 },
    );
  }
}
