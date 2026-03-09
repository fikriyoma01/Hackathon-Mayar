import { NextResponse } from "next/server";
import { z } from "zod";

import { getSessionUser } from "@/lib/auth";
import { rerouteDistribution } from "@/lib/domain";

const rerouteSchema = z.object({
  nodeId: z.string().min(3),
  actorName: z.string().min(2).optional(),
  note: z.string().max(280).optional(),
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
    const payload = rerouteSchema.parse(await request.json());
    const activity = await rerouteDistribution(user, {
      activityId,
      nodeId: payload.nodeId,
      actorName: payload.actorName ?? user.name,
      note: payload.note,
    });

    return NextResponse.json({ activityId: activity.id, nodeId: activity.nodeId });
  } catch (error) {
    return NextResponse.json(
      {
        error:
        error instanceof z.ZodError
          ? "Data pengalihan tidak valid."
          : error instanceof Error
            ? error.message
            : "Gagal menjalankan pengalihan.",
      },
      { status: 400 },
    );
  }
}
