import { NextResponse } from "next/server";
import { z } from "zod";

import { getSessionUser } from "@/lib/auth";
import { updateNodeActiveStatus } from "@/lib/domain";

const payloadSchema = z.object({
  active: z.boolean(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ nodeId: string }> },
) {
  try {
    const user = await getSessionUser();
    const { nodeId } = await context.params;
    const payload = payloadSchema.parse(await request.json());

    if (!user) {
      return NextResponse.json({ error: "Belum login." }, { status: 401 });
    }

    const canManage =
      user.role === "admin" || (user.role === "operator" && user.nodeId === nodeId);

    if (!canManage) {
      return NextResponse.json(
      { error: "Anda tidak punya akses untuk mengubah status lokasi ini." },
      { status: 403 },
    );
    }

    const node = await updateNodeActiveStatus(user, nodeId, payload.active);
    return NextResponse.json({
      nodeId: node.id,
      active: node.active,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
        error instanceof z.ZodError
          ? "Status lokasi tidak valid."
          : error instanceof Error
            ? error.message
            : "Gagal memperbarui status lokasi.",
      },
      { status: 400 },
    );
  }
}
