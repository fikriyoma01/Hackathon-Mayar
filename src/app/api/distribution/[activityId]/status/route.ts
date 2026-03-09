import { NextResponse } from "next/server";
import { z } from "zod";

import { getSessionUser } from "@/lib/auth";
import { updateDistributionStatus } from "@/lib/domain";

const distributionSchema = z.object({
  status: z.enum(["queued", "on-route", "verified", "completed", "rerouted"]),
  actorName: z.string().min(2).optional(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ activityId: string }> },
) {
  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json({ error: "Belum login." }, { status: 401 });
    }

    const { activityId } = await context.params;
    const payload = distributionSchema.parse(await request.json());
    const activity = await updateDistributionStatus({
      activityId,
      status: payload.status,
      actorName: payload.actorName ?? user.name,
    });

    return NextResponse.json({ activityId: activity.id });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof z.ZodError
            ? "Status distribusi tidak valid."
            : error instanceof Error
              ? error.message
              : "Gagal memperbarui status distribusi.",
      },
      { status: 400 },
    );
  }
}
