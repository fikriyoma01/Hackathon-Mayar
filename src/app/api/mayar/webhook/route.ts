import { timingSafeEqual } from "crypto";

import { NextResponse } from "next/server";
import { processMayarWebhook } from "@/lib/domain";

const WEBHOOK_SECRET = process.env.MAYAR_WEBHOOK_SECRET ?? "";
const WEBHOOK_TOKEN = process.env.MAYAR_WEBHOOK_TOKEN ?? "";
const PROVIDER_HEADER_NAMES = [
  "authorization",
  "x-mayar-webhook-token",
  "x-mayar-token",
  "x-webhook-token",
  "webhook-token",
  "x-callback-token",
];

function safeCompare(left: string | null, right: string) {
  if (!left || !right) {
    return false;
  }

  const normalizedLeft = Buffer.from(left.trim());
  const normalizedRight = Buffer.from(right.trim());

  if (normalizedLeft.length !== normalizedRight.length) {
    return false;
  }

  return timingSafeEqual(normalizedLeft, normalizedRight);
}

function normalizeHeaderToken(value: string | null) {
  if (!value) {
    return null;
  }

  return value.startsWith("Bearer ") ? value.slice(7).trim() : value.trim();
}

function hasValidProviderToken(request: Request) {
  if (!WEBHOOK_TOKEN) {
    return false;
  }

  return PROVIDER_HEADER_NAMES.some((headerName) =>
    safeCompare(normalizeHeaderToken(request.headers.get(headerName)), WEBHOOK_TOKEN),
  );
}

function hasValidInternalSecret(request: Request) {
  if (!WEBHOOK_SECRET) {
    return false;
  }

  const url = new URL(request.url);
  const querySecret = url.searchParams.get("secret");
  const headerSecret = request.headers.get("x-iftar-relay-webhook-secret");

  return safeCompare(querySecret, WEBHOOK_SECRET) || safeCompare(headerSecret, WEBHOOK_SECRET);
}

function hasValidWebhookSignature(request: Request) {
  if (!WEBHOOK_SECRET && !WEBHOOK_TOKEN) {
    return true;
  }

  return hasValidProviderToken(request) || hasValidInternalSecret(request);
}

export async function GET(request: Request) {
  const url = new URL(request.url);

  return NextResponse.json({
    ok: true,
    path: url.pathname,
    webhookSecretConfigured: Boolean(WEBHOOK_SECRET),
    webhookTokenConfigured: Boolean(WEBHOOK_TOKEN),
    providerTokenAccepted: hasValidProviderToken(request),
    secretAccepted: hasValidInternalSecret(request),
    signatureAccepted: hasValidWebhookSignature(request),
  });
}

export async function POST(request: Request) {
  try {
    if (!hasValidWebhookSignature(request)) {
      return NextResponse.json(
        { error: "Webhook signature tidak valid." },
        { status: 401 },
      );
    }

    const payload = await request.json();
    const transaction = await processMayarWebhook(payload);

    return NextResponse.json({
      ok: true,
      transactionId: transaction?.id ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Webhook Mayar gagal diproses.",
      },
      { status: 400 },
    );
  }
}
