import { NextResponse } from "next/server";
import { z } from "zod";

import { getSessionUser } from "@/lib/auth";
import { updatePortionStatus } from "@/lib/domain";

const statusSchema = z.object({
  status: z.enum(["available", "sponsored", "distributing", "rerouted", "completed"]),
  actorName: z.string().min(2).optional(),
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

    if (user.role !== "admin") {
      return NextResponse.json(
      { error: "Aksi langsung hanya untuk pengelola pusat. Gunakan permintaan persetujuan." },
      { status: 403 },
    );
    }

    const { portionId } = await context.params;
    const payload = statusSchema.parse(await request.json());
    const portion = await updatePortionStatus({
      portionId,
      status: payload.status,
      actorName: payload.actorName ?? user.name,
    });

    return NextResponse.json({ portionId: portion.id });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof z.ZodError
            ? "Status porsi tidak valid."
            : error instanceof Error
              ? error.message
              : "Gagal memperbarui status porsi.",
      },
      { status: 400 },
    );
  }
}
