import { NextResponse } from "next/server";
import { z } from "zod";

import { getSessionUser } from "@/lib/auth";
import { deletePortion, updatePortion } from "@/lib/domain";

const portionSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(8),
  pickupStartAt: z.string().min(10),
  pickupEndAt: z.string().min(10),
  assignedNodeId: z.string().min(3),
  tags: z.array(z.string()).optional(),
  imageUrl: z.string().optional(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ portionId: string }> },
) {
  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json({ error: "Belum login." }, { status: 401 });
    }

    const { portionId } = await context.params;
    const payload = portionSchema.parse(await request.json());
    const portion = await updatePortion(user, portionId, payload);

    return NextResponse.json({ portionId: portion.id });
  } catch (error) {
    return NextResponse.json(
      {
        error:
        error instanceof z.ZodError
          ? "Data paket tidak valid."
          : error instanceof Error
            ? error.message
            : "Gagal memperbarui paket.",
      },
      { status: 400 },
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ portionId: string }> },
) {
  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json({ error: "Belum login." }, { status: 401 });
    }

    const { portionId } = await context.params;
    const portion = await deletePortion(user, portionId);

    return NextResponse.json({ portionId: portion.id });
  } catch (error) {
    return NextResponse.json(
      {
      error: error instanceof Error ? error.message : "Gagal menghapus paket.",
    },
    { status: 400 },
  );
}
}
