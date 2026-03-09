import { NextResponse } from "next/server";

import { getMayarConfiguration } from "@/lib/mayar";

export async function GET() {
  return NextResponse.json({
    ...getMayarConfiguration(),
    mcpTransport: "SSE",
    mcpServerUrl: "https://mcp.mayar.id/sse",
    mcpHeaderName: "Authorization",
    mcpConfigPath: "C:\\Users\\fikri\\.codex\\config.toml",
    mcpNeedsReload: true,
    webhookRegistrationNote:
      "Aplikasi sudah dapat memeriksa detail pembayaran Mayar secara langsung. Konfirmasi otomatis dari Mayar sudah disiapkan, tetapi tetap membutuhkan alamat publik yang stabil agar pembaruan status berjalan penuh.",
  });
}
