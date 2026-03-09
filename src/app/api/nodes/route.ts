import { NextResponse } from "next/server";
import { z } from "zod";

import { getSessionUser } from "@/lib/auth";
import { createNode } from "@/lib/domain";

const nodeSchema = z.object({
  name: z.string().min(3),
  type: z.enum(["masjid", "komunitas"]),
  area: z.string().min(3),
  contactName: z.string().min(3),
  contactPhone: z.string().min(8),
  imageUrl: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json({ error: "Belum login." }, { status: 401 });
    }

    const payload = nodeSchema.parse(await request.json());
    const node = await createNode(user, payload);

    return NextResponse.json({ nodeId: node.id });
  } catch (error) {
    return NextResponse.json(
      {
        error:
        error instanceof z.ZodError
          ? "Data lokasi penyaluran tidak valid."
          : error instanceof Error
            ? error.message
            : "Gagal menambahkan lokasi penyaluran.",
      },
      { status: 400 },
    );
  }
}
