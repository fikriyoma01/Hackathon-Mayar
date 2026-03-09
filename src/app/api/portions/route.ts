import { NextResponse } from "next/server";
import { z } from "zod";

import { getSessionUser } from "@/lib/auth";
import { createPortion } from "@/lib/domain";

const portionSchema = z.object({
  merchantId: z.string().optional(),
  title: z.string().min(3),
  description: z.string().min(8),
  totalPortions: z.coerce.number().int().min(1).max(500),
  sponsorPrice: z.coerce.number().int().min(1000),
  pickupStartAt: z.string().min(10),
  pickupEndAt: z.string().min(10),
  assignedNodeId: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json({ error: "Belum login." }, { status: 401 });
    }

    const payload = portionSchema.parse(await request.json());
    const portion = await createPortion(user, payload);

    return NextResponse.json({ portionId: portion.id });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof z.ZodError
            ? "Data porsi tidak valid."
            : error instanceof Error
              ? error.message
              : "Gagal menambahkan porsi.",
      },
      { status: 400 },
    );
  }
}
