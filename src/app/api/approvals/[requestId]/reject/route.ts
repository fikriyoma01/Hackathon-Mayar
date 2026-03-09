import { NextResponse } from "next/server";
import { z } from "zod";

import { getSessionUser } from "@/lib/auth";
import { rejectApprovalRequest } from "@/lib/domain";

const schema = z.object({
  reviewNote: z.string().max(280).optional(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ requestId: string }> },
) {
  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json({ error: "Belum login." }, { status: 401 });
    }

    const { requestId } = await context.params;
    const payload = schema.parse(await request.json());
    const approval = await rejectApprovalRequest(user, requestId, payload.reviewNote);

    return NextResponse.json({ requestId: approval.id, status: approval.status });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof z.ZodError
            ? "Payload approval tidak valid."
            : error instanceof Error
              ? error.message
              : "Gagal menolak approval.",
      },
      { status: 400 },
    );
  }
}
