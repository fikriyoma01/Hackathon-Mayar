import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { syncPendingTransactions } from "@/lib/domain";

export async function POST() {
  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json({ error: "Belum login." }, { status: 401 });
    }

    if (user.role === "operator") {
      return NextResponse.json(
        { error: "Aksi ini hanya tersedia untuk admin dan merchant." },
        { status: 403 },
      );
    }

    const result = await syncPendingTransactions(user);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Sinkronisasi massal Mayar gagal.",
      },
      { status: 400 },
    );
  }
}
