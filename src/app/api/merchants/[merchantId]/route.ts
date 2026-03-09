import { NextResponse } from "next/server";
import { z } from "zod";

import { getSessionUser } from "@/lib/auth";
import { updateMerchantProfile } from "@/lib/domain";

const merchantSchema = z.object({
  name: z.string().min(3),
  ownerName: z.string().min(3),
  area: z.string().min(3),
  phone: z.string().min(8),
  etaMinutes: z.coerce.number().int().min(5).max(180),
  specialty: z.string().min(3),
  imageUrl: z.string().optional(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ merchantId: string }> },
) {
  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json({ error: "Belum login." }, { status: 401 });
    }

    const { merchantId } = await context.params;
    const payload = merchantSchema.parse(await request.json());
    const merchant = await updateMerchantProfile(user, merchantId, payload);

    return NextResponse.json({ merchantId: merchant.id });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof z.ZodError
            ? "Data merchant tidak valid."
            : error instanceof Error
              ? error.message
              : "Gagal memperbarui merchant.",
      },
      { status: 400 },
    );
  }
}
