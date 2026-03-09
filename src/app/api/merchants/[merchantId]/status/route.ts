import { NextResponse } from "next/server";
import { z } from "zod";

import { getSessionUser } from "@/lib/auth";
import { updateMerchantActiveStatus } from "@/lib/domain";

const payloadSchema = z.object({
  active: z.boolean(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ merchantId: string }> },
) {
  try {
    const user = await getSessionUser();
    const { merchantId } = await context.params;
    const payload = payloadSchema.parse(await request.json());

    if (!user) {
      return NextResponse.json({ error: "Belum login." }, { status: 401 });
    }

    const canManage =
      user.role === "admin" || (user.role === "merchant" && user.merchantId === merchantId);

    if (!canManage) {
      return NextResponse.json(
        { error: "Anda tidak punya akses untuk mengubah status merchant ini." },
        { status: 403 },
      );
    }

    const merchant = await updateMerchantActiveStatus(user, merchantId, payload.active);
    return NextResponse.json({
      merchantId: merchant.id,
      active: merchant.active,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof z.ZodError
            ? "Payload status merchant tidak valid."
            : error instanceof Error
              ? error.message
              : "Gagal memperbarui status merchant.",
      },
      { status: 400 },
    );
  }
}
