import type { PaymentChannel, Transaction, TransactionStatus } from "@/lib/types";

const MAYAR_API_BASE_URL = process.env.MAYAR_API_BASE_URL ?? "https://api.mayar.id/hl/v1";
const MAYAR_CHECKOUT_BASE_URL =
  process.env.MAYAR_CHECKOUT_BASE_URL ?? "https://checkout.mayar.id";
const MAYAR_API_KEY = process.env.MAYAR_API_KEY ?? "";
const APP_URL =
  process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const MAYAR_WEBHOOK_SECRET = process.env.MAYAR_WEBHOOK_SECRET ?? "";
const MAYAR_WEBHOOK_TOKEN = process.env.MAYAR_WEBHOOK_TOKEN ?? "";

function buildDefaultWebhookUrl() {
  const base = `${APP_URL}/api/mayar/webhook`;

  if (!MAYAR_WEBHOOK_SECRET) {
    return base;
  }

  return `${base}?secret=${encodeURIComponent(MAYAR_WEBHOOK_SECRET)}`;
}

const MAYAR_WEBHOOK_URL = process.env.MAYAR_WEBHOOK_URL ?? buildDefaultWebhookUrl();

export interface CreateMayarInvoiceInput {
  transactionId: string;
  donorName: string;
  donorEmail: string;
  donorPhone: string;
  amount: number;
  quantity: number;
  unitPrice: number;
  title: string;
}

export interface CreatedMayarInvoice {
  invoiceId: string;
  mayarTransactionId?: string;
  paymentUrl: string;
  checkoutPath: string;
  qrString: string;
  expiresAt: string;
  paymentChannel: PaymentChannel;
  integrationMode: "direct" | "mock";
}

export interface MayarInvoiceDetail {
  invoiceId: string;
  mayarTransactionId?: string;
  status: string;
  paidAt?: string;
  paymentUrl?: string;
  paymentMethod?: PaymentChannel;
  rawPayload: string;
}

export interface MayarWebhookEvent {
  eventName: string;
  mayarTransactionId?: string;
  mayarInvoiceId?: string;
  rawPayload: string;
}

function offsetMinutes(minutes: number) {
  const value = new Date();
  value.setMinutes(value.getMinutes() + minutes);
  return value.toISOString();
}

function shortId(value: string) {
  return value.replace(/[^A-Z0-9]/gi, "").toUpperCase().slice(-6);
}

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.startsWith("62")) {
    return digits;
  }

  if (digits.startsWith("0")) {
    return `62${digits.slice(1)}`;
  }

  return digits;
}

function toPaymentChannel(method?: string): PaymentChannel {
  const raw = method?.toLowerCase() ?? "";

  if (raw.includes("va") || raw.includes("virtual")) {
    return "Virtual Account";
  }

  if (raw.includes("link")) {
    return "Payment Link";
  }

  return "QRIS Mayar";
}

function maybePaymentChannel(method?: string) {
  if (!method) {
    return undefined;
  }

  return toPaymentChannel(method);
}

function buildCheckoutUrl(link?: string) {
  if (!link) {
    return `${MAYAR_CHECKOUT_BASE_URL}/mock/unavailable`;
  }

  if (link.startsWith("http")) {
    return link;
  }

  return `${MAYAR_CHECKOUT_BASE_URL}/${link.replace(/^\/+/, "")}`;
}

function normalizeMayarDate(value?: string | number) {
  if (!value) {
    return undefined;
  }

  if (typeof value === "number") {
    return new Date(value).toISOString();
  }

  const asNumber = Number(value);
  if (!Number.isNaN(asNumber) && value.trim() !== "") {
    return new Date(asNumber).toISOString();
  }

  return new Date(value).toISOString();
}

function buildMockInvoice(input: CreateMayarInvoiceInput): CreatedMayarInvoice {
  const stamp = Date.now().toString().slice(-4);
  const invoiceId = `MAYAR-${shortId(input.transactionId)}-${stamp}`;
  const donorToken = input.donorName
    .replace(/[^A-Za-z0-9]/g, "")
    .toUpperCase()
    .slice(0, 8);

  return {
    invoiceId,
    mayarTransactionId: `trx-${shortId(invoiceId)}`,
    paymentUrl: `https://checkout.mayar.id/mock/${invoiceId}`,
    checkoutPath: `/checkout/${input.transactionId}`,
    qrString: `${shortId(invoiceId)}${donorToken}${input.amount}`,
    expiresAt: offsetMinutes(45),
    paymentChannel: "QRIS Mayar",
    integrationMode: "mock",
  };
}

export function isMayarConfigured() {
  return Boolean(MAYAR_API_KEY);
}

export function getMayarConfiguration() {
  const isWebhookPublic =
    MAYAR_WEBHOOK_URL.startsWith("https://") &&
    !MAYAR_WEBHOOK_URL.includes("localhost");
  const hasInboundVerification = Boolean(
    MAYAR_WEBHOOK_TOKEN || MAYAR_WEBHOOK_SECRET,
  );

  return {
    apiConfigured: isMayarConfigured(),
    webhookUrl: MAYAR_WEBHOOK_URL,
    webhookSecretConfigured: Boolean(MAYAR_WEBHOOK_SECRET),
    webhookTokenConfigured: Boolean(MAYAR_WEBHOOK_TOKEN),
    verificationMode: MAYAR_WEBHOOK_TOKEN
      ? "provider-token"
      : MAYAR_WEBHOOK_SECRET
        ? "internal-secret"
        : "none",
    isWebhookPublic,
    deploymentReady: isMayarConfigured() && isWebhookPublic && hasInboundVerification,
  };
}

export async function createMayarInvoice(
  input: CreateMayarInvoiceInput,
): Promise<CreatedMayarInvoice> {
  if (!isMayarConfigured()) {
    return buildMockInvoice(input);
  }

  const expiresAt = offsetMinutes(45);
  const response = await fetch(`${MAYAR_API_BASE_URL}/invoice/create`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${MAYAR_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: input.donorName,
      email: input.donorEmail,
      mobile: normalizePhone(input.donorPhone),
      description: `Sponsor ${input.quantity} porsi ${input.title} via Iftar Relay`,
      redirectUrl: `${APP_URL}/checkout/${input.transactionId}`,
      expiredAt: expiresAt,
      items: [
        {
          name: input.title,
          description: `Sponsor porsi iftar ${input.title}`,
          quantity: input.quantity,
          rate: input.unitPrice,
          price: input.unitPrice,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Mayar invoice gagal dibuat: ${errorBody}`);
  }

  const json = (await response.json()) as {
    data?: {
      id?: string | number;
      status?: string;
      link?: string;
      paymentUrl?: string;
      transactionId?: string | number;
      expiredAt?: string | number;
      paymentDetail?: {
        qrString?: string;
        paymentMethod?: string;
      };
    };
  };

  const data = json.data ?? {};
  const invoiceId = String(data.id ?? shortId(input.transactionId));

  return {
    invoiceId,
    mayarTransactionId: data.transactionId ? String(data.transactionId) : undefined,
    paymentUrl: buildCheckoutUrl(data.paymentUrl ?? data.link),
    checkoutPath: `/checkout/${input.transactionId}`,
    qrString: data.paymentDetail?.qrString ?? "",
    expiresAt: normalizeMayarDate(data.expiredAt) ?? expiresAt,
    paymentChannel: toPaymentChannel(data.paymentDetail?.paymentMethod),
    integrationMode: "direct",
  };
}

export async function fetchMayarInvoiceDetail(invoiceId: string) {
  if (!isMayarConfigured()) {
    throw new Error("Kredensial Mayar belum diatur.");
  }

  const response = await fetch(`${MAYAR_API_BASE_URL}/invoice/${invoiceId}`, {
    headers: {
      Authorization: `Bearer ${MAYAR_API_KEY}`,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Gagal mengambil detail invoice Mayar: ${errorBody}`);
  }

  const json = (await response.json()) as {
    data?: {
      id?: string | number;
      status?: string;
      link?: string;
      paymentUrl?: string;
      transactionId?: string | number;
      transactions?: Array<{ id?: string | number }>;
      paidAt?: string | number;
      paymentDetail?: {
        paymentMethod?: string;
      };
    };
  };

  const data = json.data ?? {};

  return {
    invoiceId: String(data.id ?? invoiceId),
    mayarTransactionId:
      data.transactionId || data.transactions?.[0]?.id
        ? String(data.transactionId ?? data.transactions?.[0]?.id)
        : undefined,
    status: data.status ?? "unpaid",
    paidAt: normalizeMayarDate(data.paidAt),
    paymentUrl: data.paymentUrl
      ? buildCheckoutUrl(data.paymentUrl)
      : data.link
        ? buildCheckoutUrl(data.link)
        : undefined,
    paymentMethod: maybePaymentChannel(data.paymentDetail?.paymentMethod),
    rawPayload: JSON.stringify(json),
  } satisfies MayarInvoiceDetail;
}


export function extractMayarWebhookEvent(payload: unknown): MayarWebhookEvent {
  const source = payload as Record<string, unknown>;
  const data = (source.data as Record<string, unknown> | undefined) ?? source;
  const eventName = String(
    source.event ?? source["event.received"] ?? source.type ?? "unknown",
  );

  return {
    eventName,
    mayarTransactionId:
      data.transactionId || data.id ? String(data.transactionId ?? data.id) : undefined,
    mayarInvoiceId:
      data.invoiceId || source.invoiceId
        ? String(data.invoiceId ?? source.invoiceId)
        : undefined,
    rawPayload: JSON.stringify(payload),
  };
}

export function mapMayarStatusToTransaction(status: string): TransactionStatus {
  const normalized = status.toLowerCase();

  if (normalized === "paid") {
    return "paid";
  }

  if (normalized === "closed" || normalized === "expired") {
    return "expired";
  }

  if (normalized === "failed") {
    return "failed";
  }

  return "pending";
}

export function buildPaidWebhookPayload(transaction: Transaction) {
  return {
    event: "payment.received",
    data: {
      id: transaction.mayarTransactionId ?? transaction.mayarInvoiceId,
      invoiceId: transaction.mayarInvoiceId,
    },
  };
}
