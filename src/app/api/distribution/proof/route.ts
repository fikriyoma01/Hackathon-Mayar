import { mkdir, writeFile } from "fs/promises";
import path from "path";

import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { attachProofToDistribution } from "@/lib/domain";

function safeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9.-]/g, "-").toLowerCase();
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json({ error: "Belum login." }, { status: 401 });
    }

    const formData = await request.formData();
    const activityId = String(formData.get("activityId") ?? "");
    const note = String(formData.get("note") ?? "");
    const actorName = String(formData.get("actorName") ?? user.name);
    const file = formData.get("file");

    if (!activityId || !note || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Data bukti lapangan belum lengkap." },
        { status: 400 },
      );
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });

    const extension = path.extname(file.name) || ".jpg";
    const fileName = `${Date.now()}-${safeFileName(file.name.replace(extension, ""))}${extension}`;
    const targetPath = path.join(uploadDir, fileName);
    const arrayBuffer = await file.arrayBuffer();

    await writeFile(targetPath, Buffer.from(arrayBuffer));

    const activity = await attachProofToDistribution({
      activityId,
      actorName,
      note,
      proofImageUrl: `/uploads/${fileName}`,
    });

    return NextResponse.json({ activityId: activity.id });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Upload bukti gagal.",
      },
      { status: 400 },
    );
  }
}
