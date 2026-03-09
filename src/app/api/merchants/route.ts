import { NextResponse } from "next/server";
import { z } from "zod";

import { getSessionUser } from "@/lib/auth";
import { createMerchant } from "@/lib/domain";

const merchantSchema = z.object({
  name: z.string().min(3),
  ownerName: z.string().min(3),
  area: z.string().min(3),
  phone: z.string().min(8),
  etaMinutes: z.coerce.number().int().min(5).max(180),
  specialty: z.string().min(3),
  imageUrl: z.string().optional(),
  logoUrl: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json({ error: "Belum login." }, { status: 401 });
    }

    const payload = merchantSchema.parse(await request.json());
    const merchant = await createMerchant(user, payload);

    return NextResponse.json({ merchantId: merchant.id });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof z.ZodError
            ? "Data merchant tidak valid."
            : error instanceof Error
              ? error.message
              : "Gagal menambahkan merchant.",
      },
      { status: 400 },
    );
  }
}
