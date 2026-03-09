import { NextResponse } from "next/server";
import { z } from "zod";

import { getSessionUser } from "@/lib/auth";
import { requestPortionStatusApproval } from "@/lib/domain";

const requestSchema = z.object({
  status: z.enum(["available", "sponsored", "distributing", "rerouted", "completed"]),
  requestNote: z.string().max(280).optional(),
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
    const payload = requestSchema.parse(await request.json());
    const approval = await requestPortionStatusApproval(
      user,
      portionId,
      payload.status,
      payload.requestNote,
    );

    return NextResponse.json({ requestId: approval.id });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof z.ZodError
            ? "Payload approval status tidak valid."
            : error instanceof Error
              ? error.message
              : "Gagal mengajukan approval.",
      },
      { status: 400 },
    );
  }
}
