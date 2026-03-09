import { randomUUID } from "crypto";

import {
  createMayarInvoice,
  extractMayarWebhookEvent,
  fetchMayarInvoiceDetail,
  isMayarConfigured,
  mapMayarStatusToTransaction,
} from "@/lib/mayar";
import { readStore, resetStore as resetRawStore, writeStore } from "@/lib/store";
import type {
  ActivityLog,
  ApprovalRequest,
  AppStore,
  AppUser,
  AttachProofInput,
  CreateMerchantInput,
  CreateNodeInput,
  CreatePortionInput,
  CreateSponsorTransactionInput,
  DistributionNode,
  DistributionActivity,
  DistributionStatus,
  Merchant,
  Portion,
  PortionStatus,
  RerouteDistributionInput,
  Transaction,
  UpdateDistributionStatusInput,
  UpdateMerchantInput,
  UpdateNodeInput,
  UpdatePortionInput,
  UpdatePortionStatusInput,
  VerifyVoucherInput,
  Voucher,
} from "@/lib/types";
import { slugify, toTitleCase } from "@/lib/utils";

function nowIso() {
  return new Date().toISOString();
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function pushLog(
  store: AppStore,
  log: Omit<ActivityLog, "id" | "timestamp"> & { timestamp?: string },
) {
  store.activityLogs.unshift({
    id: randomUUID(),
    timestamp: log.timestamp ?? nowIso(),
    ...log,
  });
}

function createVoucherCode(base: string) {
  return `VCR-${base.toUpperCase().slice(0, 5)}-${Math.floor(
    100 + Math.random() * 900,
  )}`;
}

function createEntityId(prefix: string, seed: string) {
  return `${prefix}-${slugify(seed).slice(0, 18)}-${randomUUID().slice(0, 6)}`;
}

function actorRoleLabel(actor: AppUser) {
  switch (actor.role) {
    case "admin":
      return "Pengelola pusat";
    case "merchant":
      return "Merchant";
    case "operator":
      return "Petugas lapangan";
  }
}

function deriveDistributionPriority(activity: DistributionActivity) {
  if (activity.status === "completed") {
    return "normal" as const;
  }

  const minutesToDue =
    (new Date(activity.taskDueAt).getTime() - Date.now()) / (60 * 1000);

  if (activity.status === "rerouted" || minutesToDue <= 20) {
    return "critical" as const;
  }

  if (activity.status === "queued" || minutesToDue <= 45) {
    return "high" as const;
  }

  return "normal" as const;
}

function resolvePortionImage(store: AppStore, merchantId: string) {
  return (
    store.merchants.find((merchant) => merchant.id === merchantId)?.imageUrl ??
    "/images/food-package.png"
  );
}

function findTransactionByMayarReference(
  store: AppStore,
  reference: string,
) {
  return store.transactions.find(
    (transaction) =>
      transaction.mayarInvoiceId === reference ||
      transaction.mayarTransactionId === reference,
  );
}

function activatePaidTransaction(
  store: AppStore,
  transaction: Transaction,
  options?: {
    paymentMethod?: Transaction["paymentChannel"];
    paidAt?: string;
    mayarTransactionId?: string;
    webhookPayload?: string;
  },
) {
  if (transaction.status === "paid") {
    if (options?.mayarTransactionId && !transaction.mayarTransactionId) {
      transaction.mayarTransactionId = options.mayarTransactionId;
    }
    if (options?.webhookPayload) {
      transaction.mayarWebhookPayload = options.webhookPayload;
    }
    return transaction;
  }

  if (transaction.status === "expired") {
    throw new Error("Pembayaran sudah kedaluwarsa dan tidak bisa diselesaikan.");
  }

  const portion = store.portions.find((item) => item.id === transaction.portionId);

  if (!portion) {
    throw new Error("Porsi untuk transaksi ini tidak ditemukan.");
  }

  transaction.status = "paid";
  transaction.paidAt = options?.paidAt ?? nowIso();
  transaction.paymentChannel = options?.paymentMethod ?? transaction.paymentChannel;
  transaction.mayarTransactionId =
    options?.mayarTransactionId ?? transaction.mayarTransactionId;
  transaction.mayarWebhookPayload =
    options?.webhookPayload ?? transaction.mayarWebhookPayload;

  portion.availablePortions = Math.max(
    portion.availablePortions - transaction.sponsoredPortions,
    0,
  );
  portion.sponsoredPortions += transaction.sponsoredPortions;
  portion.lastUpdatedAt = nowIso();

  const merchant = store.merchants.find((item) => item.id === portion.merchantId);
  const node = store.nodes.find((item) => item.id === portion.assignedNodeId);

  if (!transaction.voucherId) {
    const voucherCode = createVoucherCode(slugify(merchant?.name ?? portion.title));
    const voucher: Voucher = {
      id: randomUUID(),
      code: voucherCode,
      portionId: portion.id,
      transactionId: transaction.id,
      merchantId: portion.merchantId,
      assignedNodeId: portion.assignedNodeId,
      recipientAlias: node?.name ?? "Lokasi penyaluran",
      portionCount: transaction.sponsoredPortions,
      status: "active",
      expiresAt: portion.expiresAt,
      qrPayload: `iftarrelay://voucher/${voucherCode}`,
      createdAt: nowIso(),
      imageUrl: "/images/digital-voucher.png",
    };

    const distribution: DistributionActivity = {
      id: randomUUID(),
      voucherId: voucher.id,
      portionId: portion.id,
      nodeId: voucher.assignedNodeId,
      actorName: "Sistem penyaluran",
      actorRole: "Pengaturan otomatis",
      locationLabel: `Pengambilan di ${merchant?.name ?? "merchant"}`,
      status: "queued",
      note: "Voucher aktif setelah pembayaran dikonfirmasi.",
      taskDueAt: portion.pickupEndAt,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      routeImageUrl: node?.imageUrl ?? "/images/takjil-roti.png",
    };

    transaction.voucherId = voucher.id;
    store.vouchers.unshift(voucher);
    store.distributions.unshift(distribution);

    pushLog(store, {
      title: "Voucher siap digunakan",
      description: `${voucher.portionCount} porsi siap diterima di ${merchant?.name ?? "merchant"}.`,
      entityType: "voucher",
      entityId: voucher.id,
      actor: "Sistem penyaluran",
      tone: "success",
    });
  }

  portion.status = derivePortionStatus(store, portion);

  pushLog(store, {
    title: "Pembayaran diterima",
    description: `Pembayaran ${transaction.mayarInvoiceId} lunas dan voucher langsung aktif.`,
    entityType: "payment",
    entityId: transaction.id,
    actor: "Konfirmasi otomatis Mayar",
    tone: "success",
  });

  return transaction;
}

function getPendingReservedPortions(store: AppStore, portionId: string) {
  const now = Date.now();

  return store.transactions
    .filter(
      (transaction) =>
        transaction.portionId === portionId &&
        transaction.status === "pending" &&
        new Date(transaction.expiresAt).getTime() > now,
    )
    .reduce((total, transaction) => total + transaction.sponsoredPortions, 0);
}

function derivePortionStatus(store: AppStore, portion: Portion): PortionStatus {
  const vouchers = store.vouchers.filter((voucher) => voucher.portionId === portion.id);
  const hasReroutedVoucher = vouchers.some((voucher) => voucher.status === "rerouted");

  if (
    portion.availablePortions === 0 &&
    portion.sponsoredPortions > 0 &&
    portion.distributedPortions >= portion.sponsoredPortions
  ) {
    return "completed";
  }

  if (portion.distributedPortions > 0 && portion.distributedPortions < portion.sponsoredPortions) {
    return "distributing";
  }

  if (hasReroutedVoucher) {
    return "rerouted";
  }

  if (portion.sponsoredPortions > portion.distributedPortions) {
    return "sponsored";
  }

  return "available";
}

function syncOperationalState(store: AppStore) {
  let changed = false;
  const now = Date.now();

  for (const transaction of store.transactions) {
    if (
      transaction.status === "pending" &&
      new Date(transaction.expiresAt).getTime() <= now
    ) {
      transaction.status = "expired";
      changed = true;

      pushLog(store, {
        title: "Pembayaran kedaluwarsa",
        description: `Pembayaran ${transaction.mayarInvoiceId} otomatis ditandai kedaluwarsa.`,
        entityType: "payment",
        entityId: transaction.id,
        actor: "Pembaruan Mayar",
        tone: "warning",
      });
    }
  }

  for (const voucher of store.vouchers) {
    if (voucher.status !== "active") {
      continue;
    }

    const assignedNode = store.nodes.find((node) => node.id === voucher.assignedNodeId);
    const voucherExpired = new Date(voucher.expiresAt).getTime() <= now;
    const nodeInactive = assignedNode ? !assignedNode.active : false;

    if (!voucherExpired && !nodeInactive) {
      continue;
    }

    const alternativeNode =
      store.nodes.find(
        (node) => node.active && node.id !== voucher.assignedNodeId,
      ) ?? store.nodes.find((node) => node.active);

    voucher.status = "rerouted";
    if (alternativeNode) {
      voucher.assignedNodeId = alternativeNode.id;
    }

    const distribution = store.distributions.find(
      (activity) => activity.voucherId === voucher.id,
    );

    if (distribution) {
      distribution.status = "rerouted";
      distribution.updatedAt = nowIso();
      if (alternativeNode) {
        distribution.nodeId = alternativeNode.id;
        distribution.locationLabel = alternativeNode.name;
      }
      distribution.note = voucherExpired
        ? "Dialihkan otomatis agar paket tetap tersalurkan sebelum berbuka."
        : "Dialihkan otomatis karena lokasi sebelumnya sedang tidak aktif.";
    }

    changed = true;

    pushLog(store, {
      title: nodeInactive ? "Voucher dialihkan karena lokasi tidak aktif" : "Voucher dialihkan otomatis",
      description: nodeInactive
        ? `Voucher ${voucher.code} berpindah ke lokasi aktif agar penyaluran tidak terhenti.`
        : `Voucher ${voucher.code} berpindah ke lokasi terdekat agar bantuan tetap sampai tepat waktu.`,
      entityType: "voucher",
      entityId: voucher.id,
      actor: "Sistem penyaluran",
      tone: "warning",
    });
  }

  for (const portion of store.portions) {
    const nextStatus = derivePortionStatus(store, portion);

    if (portion.status !== nextStatus) {
      portion.status = nextStatus;
      portion.lastUpdatedAt = nowIso();
      changed = true;
    }
  }

  return changed;
}

export async function getHydratedStore() {
  const store = await readStore();

  if (syncOperationalState(store)) {
    await writeStore(store);
  }

  return store;
}

export async function findUserById(userId: string) {
  const store = await getHydratedStore();
  return store.users.find((user) => user.id === userId) ?? null;
}

export async function findUserByCredentials(email: string, password: string) {
  const store = await getHydratedStore();
  return (
    store.users.find(
      (user) =>
        user.email.toLowerCase() === email.toLowerCase().trim() &&
        user.password === password,
    ) ?? null
  );
}

function buildScope(store: AppStore, user: AppUser) {
  if (user.role === "admin") {
    return {
      merchants: store.merchants,
      nodes: store.nodes,
      portions: store.portions,
      transactions: store.transactions,
      vouchers: store.vouchers,
      distributions: store.distributions,
    };
  }

  if (user.role === "merchant") {
    const portions = store.portions.filter(
      (portion) => portion.merchantId === user.merchantId,
    );
    const portionIds = new Set(portions.map((portion) => portion.id));

    return {
      merchants: store.merchants.filter((merchant) => merchant.id === user.merchantId),
      nodes: store.nodes,
      portions,
      transactions: store.transactions.filter((transaction) =>
        portionIds.has(transaction.portionId),
      ),
      vouchers: store.vouchers.filter((voucher) => portionIds.has(voucher.portionId)),
      distributions: store.distributions.filter((distribution) =>
        portionIds.has(distribution.portionId),
      ),
    };
  }

  const distributions = store.distributions.filter(
    (distribution) => distribution.nodeId === user.nodeId,
  );
  const portionIds = new Set(distributions.map((distribution) => distribution.portionId));
  const voucherIds = new Set(
    distributions
      .map((distribution) => distribution.voucherId)
      .filter((value): value is string => Boolean(value)),
  );
  const portions = store.portions.filter((portion) => portionIds.has(portion.id));
  const merchantIds = new Set(portions.map((portion) => portion.merchantId));

  return {
    merchants: store.merchants.filter((merchant) => merchantIds.has(merchant.id)),
    nodes: store.nodes.filter((node) => node.id === user.nodeId),
    portions,
    transactions: store.transactions.filter((transaction) =>
      portionIds.has(transaction.portionId),
    ),
    vouchers: store.vouchers.filter(
      (voucher) => portionIds.has(voucher.portionId) || voucherIds.has(voucher.id),
    ),
    distributions,
  };
}

function buildMetrics(store: ReturnType<typeof buildScope>) {
  const distributedPortions = sum(
    store.portions.map((portion) => portion.distributedPortions),
  );
  const availablePortions = sum(
    store.portions.map((portion) => portion.availablePortions),
  );
  const sponsoredOpen = sum(
    store.portions.map((portion) =>
      Math.max(portion.sponsoredPortions - portion.distributedPortions, 0),
    ),
  );
  const activeDonors = new Set(
    store.transactions
      .filter((transaction) => transaction.status === "paid")
      .map((transaction) => transaction.donorEmail.toLowerCase()),
  ).size;
  const mayarSettled = sum(
    store.transactions
      .filter((transaction) => transaction.status === "paid")
      .map((transaction) => transaction.amount),
  );
  const pendingPayments = store.transactions.filter(
    (transaction) => transaction.status === "pending",
  ).length;

  return {
    distributedPortions,
    availablePortions,
    sponsoredOpen,
    activeMerchants: store.merchants.filter((merchant) => merchant.active).length,
    activeDonors,
    mayarSettled,
    pendingPayments,
  };
}

function filterLogs(store: AppStore, scope: ReturnType<typeof buildScope>) {
  const portionIds = new Set(scope.portions.map((portion) => portion.id));
  const transactionIds = new Set(scope.transactions.map((transaction) => transaction.id));
  const voucherIds = new Set(scope.vouchers.map((voucher) => voucher.id));
  const distributionIds = new Set(
    scope.distributions.map((distribution) => distribution.id),
  );

  return store.activityLogs.filter((log) => {
    if (log.entityType === "portion") {
      return portionIds.has(log.entityId);
    }

    if (log.entityType === "transaction" || log.entityType === "payment") {
      return transactionIds.has(log.entityId);
    }

    if (log.entityType === "voucher") {
      return voucherIds.has(log.entityId);
    }

    if (log.entityType === "distribution") {
      return distributionIds.has(log.entityId);
    }

    return true;
  });
}

function canManagePortion(actor: AppUser, portion: Portion) {
  return actor.role === "admin" || (actor.role === "merchant" && actor.merchantId === portion.merchantId);
}

function canManageDistribution(actor: AppUser, activity: DistributionActivity) {
  return actor.role === "admin" || (actor.role === "operator" && actor.nodeId === activity.nodeId);
}

function createApprovalRequest(
  store: AppStore,
  request: Omit<ApprovalRequest, "id" | "createdAt" | "status">,
) {
  const existingRequest = store.approvalRequests.find(
    (item) =>
      item.status === "pending" &&
      item.actionType === request.actionType &&
      item.entityId === request.entityId &&
      JSON.stringify(item.payload) === JSON.stringify(request.payload),
  );

  if (existingRequest) {
    throw new Error("Masih ada permintaan serupa yang belum ditinjau.");
  }

  const nextRequest: ApprovalRequest = {
    id: randomUUID(),
    createdAt: nowIso(),
    status: "pending",
    ...request,
  };

  store.approvalRequests.unshift(nextRequest);
  return nextRequest;
}

function applyPortionStatusUpdate(store: AppStore, input: UpdatePortionStatusInput) {
  const portion = store.portions.find((item) => item.id === input.portionId);

  if (!portion) {
    throw new Error("Porsi tidak ditemukan.");
  }

  portion.status = input.status;
  portion.lastUpdatedAt = nowIso();

  pushLog(store, {
    title: "Status paket diperbarui",
    description: `${portion.title} kini berstatus ${input.status}.`,
    entityType: "portion",
    entityId: portion.id,
    actor: input.actorName,
    tone: "info",
  });

  return portion;
}

function applyDistributionReroute(
  store: AppStore,
  actor: AppUser,
  input: RerouteDistributionInput,
) {
  const activity = store.distributions.find((item) => item.id === input.activityId);

  if (!activity) {
    throw new Error("Aktivitas distribusi tidak ditemukan.");
  }

  if (activity.status === "completed") {
    throw new Error("Tugas yang sudah selesai tidak bisa dialihkan.");
  }

  const nextNode = store.nodes.find((item) => item.id === input.nodeId);

  if (!nextNode) {
    throw new Error("Lokasi penyaluran tujuan tidak ditemukan.");
  }

  if (!nextNode.active) {
    throw new Error("Lokasi penyaluran tujuan sedang tidak aktif.");
  }

  if (activity.nodeId === nextNode.id) {
    throw new Error("Tugas ini sudah berada di lokasi penyaluran tersebut.");
  }

  const previousLocationLabel = activity.locationLabel;
  const voucher = activity.voucherId
    ? store.vouchers.find((item) => item.id === activity.voucherId)
    : null;

  activity.nodeId = nextNode.id;
  activity.locationLabel = nextNode.name;
  activity.actorName = input.actorName;
  activity.actorRole = actorRoleLabel(actor);
  activity.status = "rerouted";
  activity.updatedAt = nowIso();
  activity.note =
    input.note?.trim() ||
    `Dialihkan manual ke ${nextNode.name} agar penyaluran tetap tepat waktu.`;

  if (voucher) {
    voucher.assignedNodeId = nextNode.id;
    voucher.recipientAlias = nextNode.name;
    voucher.status = "rerouted";
  }

  const portion = store.portions.find((item) => item.id === activity.portionId);

  if (portion) {
    portion.status = "rerouted";
    portion.lastUpdatedAt = nowIso();
  }

  pushLog(store, {
    title: "Penyaluran dialihkan",
    description: `${previousLocationLabel} dialihkan ke ${nextNode.name} agar bantuan tetap tiba tepat waktu.`,
    entityType: "distribution",
    entityId: activity.id,
    actor: actor.name,
    tone: "warning",
  });

  return activity;
}

export async function getLandingSnapshot() {
  const store = await getHydratedStore();
  const activeMerchantIds = new Set(
    store.merchants.filter((merchant) => merchant.active).map((merchant) => merchant.id),
  );
  const activePortions = [...store.portions]
    .filter(
      (portion) =>
        portion.availablePortions > 0 && activeMerchantIds.has(portion.merchantId),
    )
    .sort(
      (left, right) =>
        new Date(left.expiresAt).getTime() - new Date(right.expiresAt).getTime(),
    );

  return {
    merchants: store.merchants,
    nodes: store.nodes,
    activePortions,
    recentLogs: store.activityLogs.slice(0, 5),
    metrics: buildMetrics(buildScope(store, store.users[0])),
  };
}

export async function getDashboardSnapshot(userId: string) {
  const store = await getHydratedStore();
  const user = store.users.find((item) => item.id === userId);

  if (!user) {
    throw new Error("Sesi pengguna tidak ditemukan.");
  }

  const scope = buildScope(store, user);
  const distributions = scope.distributions.map((distribution) => ({
    ...distribution,
    priorityLevel: deriveDistributionPriority(distribution),
  }));
  const metrics = buildMetrics(scope);
  const recentLogs = filterLogs(store, scope).slice(0, 8);
  const priorityRank = { critical: 0, high: 1, normal: 2 } as const;
  const openTasks = distributions
    .filter((distribution) => distribution.status !== "completed")
    .sort(
      (left, right) =>
        priorityRank[left.priorityLevel] - priorityRank[right.priorityLevel] ||
        new Date(left.taskDueAt).getTime() - new Date(right.taskDueAt).getTime(),
    );
  const recentProofs = distributions
    .filter((distribution) => distribution.proofImageUrl)
    .slice(0, 4);

  return {
    user,
    metrics,
    recentLogs,
    openTasks,
    recentProofs,
    ...scope,
    distributions,
  };
}

export async function getTransactionDetail(userId: string, transactionId: string) {
  const snapshot = await getDashboardSnapshot(userId);
  const transaction = snapshot.transactions.find((item) => item.id === transactionId);

  if (!transaction) {
    return null;
  }

  const portion = snapshot.portions.find((item) => item.id === transaction.portionId) ?? null;
  const voucher = transaction.voucherId
    ? snapshot.vouchers.find((item) => item.id === transaction.voucherId) ?? null
    : null;
  const distribution = voucher
    ? snapshot.distributions.find((item) => item.voucherId === voucher.id) ?? null
    : null;

  return {
    ...snapshot,
    transaction,
    portion,
    voucher,
    distribution,
  };
}

export async function getDistributionDetail(userId: string, activityId: string) {
  const snapshot = await getDashboardSnapshot(userId);
  const activity = snapshot.distributions.find((item) => item.id === activityId);

  if (!activity) {
    return null;
  }

  const portion = snapshot.portions.find((item) => item.id === activity.portionId) ?? null;
  const voucher = activity.voucherId
    ? snapshot.vouchers.find((item) => item.id === activity.voucherId) ?? null
    : null;
  const node = snapshot.nodes.find((item) => item.id === activity.nodeId) ?? null;

  return {
    ...snapshot,
    activity,
    portion,
    voucher,
    node,
  };
}

export async function getDonorDetail(userId: string, donorEmail: string) {
  const snapshot = await getDashboardSnapshot(userId);
  const normalizedEmail = donorEmail.toLowerCase();
  const transactions = snapshot.transactions
    .filter((transaction) => transaction.donorEmail.toLowerCase() === normalizedEmail)
    .sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    );

  if (transactions.length === 0) {
    return null;
  }

  const donor = transactions[0];
  const transactionIds = new Set(transactions.map((transaction) => transaction.id));
  const vouchers = snapshot.vouchers.filter((voucher) =>
    transactions.some((transaction) => transaction.voucherId === voucher.id),
  );
  const voucherIds = new Set(vouchers.map((voucher) => voucher.id));
  const distributions = snapshot.distributions.filter((distribution) =>
    distribution.voucherId ? voucherIds.has(distribution.voucherId) : false,
  );
  const recentLogs = snapshot.recentLogs.filter(
    (log) =>
      transactionIds.has(log.entityId) ||
      voucherIds.has(log.entityId) ||
      distributions.some((distribution) => distribution.id === log.entityId),
  );

  return {
    donor: {
      name: donor.donorName,
      email: donor.donorEmail,
      phone: donor.donorPhone,
      totalTransactions: transactions.length,
      settledAmount: sum(
        transactions
          .filter((transaction) => transaction.status === "paid")
          .map((transaction) => transaction.amount),
      ),
      pendingAmount: sum(
        transactions
          .filter((transaction) => transaction.status === "pending")
          .map((transaction) => transaction.amount),
      ),
      sponsoredPortions: sum(
        transactions.map((transaction) => transaction.sponsoredPortions),
      ),
      paidTransactions: transactions.filter((transaction) => transaction.status === "paid")
        .length,
      pendingTransactions: transactions.filter(
        (transaction) => transaction.status === "pending",
      ).length,
      lastActivityAt: transactions[0].createdAt,
    },
    transactions,
    vouchers,
    distributions,
    portions: snapshot.portions.filter((portion) =>
      transactions.some((transaction) => transaction.portionId === portion.id),
    ),
    recentLogs,
  };
}

export async function getApprovalQueue(userId: string) {
  const store = await getHydratedStore();
  const user = store.users.find((item) => item.id === userId);

  if (!user) {
    throw new Error("Sesi pengguna tidak ditemukan.");
  }

  const scopedRequests = store.approvalRequests.filter((request) => {
    if (user.role === "admin") {
      return true;
    }

    if (request.entityType === "portion" && user.role === "merchant") {
      const portion = store.portions.find((item) => item.id === request.entityId);
      return portion?.merchantId === user.merchantId;
    }

    if (request.entityType === "distribution" && user.role === "operator") {
      const activity = store.distributions.find((item) => item.id === request.entityId);
      return activity?.nodeId === user.nodeId;
    }

    return false;
  });

  return scopedRequests.sort((left, right) => {
    if (left.status === right.status) {
      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    }

    return left.status === "pending" ? -1 : 1;
  });
}

export async function getVoucherDetail(code: string) {
  const store = await getHydratedStore();
  const voucher = store.vouchers.find(
    (item) => item.code.toUpperCase() === code.toUpperCase(),
  );

  if (!voucher) {
    return null;
  }

  const portion = store.portions.find((item) => item.id === voucher.portionId) ?? null;
  const transaction =
    store.transactions.find((item) => item.id === voucher.transactionId) ?? null;
  const merchant = store.merchants.find((item) => item.id === voucher.merchantId) ?? null;
  const node = store.nodes.find((item) => item.id === voucher.assignedNodeId) ?? null;
  const distribution =
    store.distributions.find((item) => item.voucherId === voucher.id) ?? null;

  return {
    voucher,
    portion,
    transaction,
    merchant,
    node,
    distribution,
  };
}

export async function createPortion(actor: AppUser, input: CreatePortionInput) {
  const store = await getHydratedStore();

  if (actor.role === "operator") {
    throw new Error("Petugas lapangan tidak bisa menambahkan paket baru.");
  }

  const merchantId =
    actor.role === "merchant" ? actor.merchantId : input.merchantId;

  if (!merchantId) {
    throw new Error("Merchant untuk paket ini harus dipilih terlebih dahulu.");
  }

  const merchant = store.merchants.find((item) => item.id === merchantId);

  if (!merchant) {
    throw new Error("Merchant untuk akun ini tidak ditemukan.");
  }

  if (!merchant.active) {
    throw new Error("Merchant sedang tidak aktif. Aktifkan kembali sebelum menambahkan paket baru.");
  }

  const assignedNodeId =
    input.assignedNodeId ?? store.nodes.find((node) => node.active)?.id;

  if (!assignedNodeId) {
    throw new Error("Tidak ada lokasi penyaluran aktif.");
  }

  const assignedNode = store.nodes.find((node) => node.id === assignedNodeId);

  if (!assignedNode?.active) {
    throw new Error("Lokasi penyaluran yang dipilih sedang tidak aktif.");
  }

  const nextPortion: Portion = {
    id: randomUUID(),
    merchantId,
    title: input.title,
    description: input.description,
    totalPortions: input.totalPortions,
    availablePortions: input.totalPortions,
    sponsoredPortions: 0,
    distributedPortions: 0,
    price: input.sponsorPrice + 3000,
    sponsorPrice: input.sponsorPrice,
    pickupStartAt: input.pickupStartAt,
    pickupEndAt: input.pickupEndAt,
    expiresAt: input.pickupEndAt,
    status: "available",
    assignedNodeId,
    tags: input.tags?.map((item) => toTitleCase(item)) ?? ["Input mobile"],
    lastUpdatedAt: nowIso(),
    imageUrl: resolvePortionImage(store, merchantId),
  };

  store.portions.unshift(nextPortion);

  pushLog(store, {
    title: "Paket baru ditambahkan",
    description: `${nextPortion.title} siap dibuka untuk bantuan baru.`,
    entityType: "portion",
    entityId: nextPortion.id,
    actor: actor.name,
    tone: "success",
  });

  await writeStore(store);
  return nextPortion;
}

export async function createMerchant(actor: AppUser, input: CreateMerchantInput) {
  if (actor.role !== "admin") {
    throw new Error("Hanya admin yang dapat menambahkan merchant baru.");
  }

  const store = await getHydratedStore();
  const merchant: Merchant = {
    id: createEntityId("merchant", input.name),
    name: input.name,
    ownerName: input.ownerName,
    area: input.area,
    active: true,
    phone: input.phone,
    etaMinutes: input.etaMinutes,
    rating: 4.8,
    specialty: input.specialty,
    logoUrl: input.logoUrl ?? "/images/logo.png",
    imageUrl: input.imageUrl ?? "/images/merchant.png",
  };

  store.merchants.unshift(merchant);

  pushLog(store, {
    title: "Merchant baru ditambahkan",
    description: `${merchant.name} siap menerima bantuan baru dan voucher digital.`,
    entityType: "system",
    entityId: merchant.id,
    actor: actor.name,
    tone: "success",
  });

  await writeStore(store);
  return merchant;
}

export async function createNode(actor: AppUser, input: CreateNodeInput) {
  if (actor.role !== "admin") {
    throw new Error("Hanya pengelola pusat yang dapat menambahkan lokasi penyaluran.");
  }

  const store = await getHydratedStore();
  const node: DistributionNode = {
    id: createEntityId("node", input.name),
    name: input.name,
    type: input.type,
    area: input.area,
    contactName: input.contactName,
    contactPhone: input.contactPhone,
    active: true,
    imageUrl:
      input.imageUrl ??
      (input.type === "masjid" ? "/images/mosque.png" : "/images/charity-box.png"),
  };

  store.nodes.unshift(node);

  pushLog(store, {
    title: "Lokasi penyaluran baru ditambahkan",
    description: `${node.name} siap menerima penyaluran, pengambilan, dan pengalihan.`,
    entityType: "system",
    entityId: node.id,
    actor: actor.name,
    tone: "success",
  });

  await writeStore(store);
  return node;
}

export async function updateMerchantProfile(
  actor: AppUser,
  merchantId: string,
  input: UpdateMerchantInput,
) {
  const canManage =
    actor.role === "admin" || (actor.role === "merchant" && actor.merchantId === merchantId);

  if (!canManage) {
    throw new Error("Anda tidak punya akses untuk memperbarui merchant ini.");
  }

  const store = await getHydratedStore();
  const merchant = store.merchants.find((item) => item.id === merchantId);

  if (!merchant) {
    throw new Error("Merchant tidak ditemukan.");
  }

  merchant.name = input.name;
  merchant.ownerName = input.ownerName;
  merchant.area = input.area;
  merchant.phone = input.phone;
  merchant.etaMinutes = input.etaMinutes;
  merchant.specialty = input.specialty;
  merchant.imageUrl = input.imageUrl ?? merchant.imageUrl;

  pushLog(store, {
    title: "Profil merchant diperbarui",
    description: `${merchant.name} kini memakai detail operasional terbaru.`,
    entityType: "system",
    entityId: merchant.id,
    actor: actor.name,
    tone: "info",
  });

  await writeStore(store);
  return merchant;
}

export async function updateNodeProfile(
  actor: AppUser,
  nodeId: string,
  input: UpdateNodeInput,
) {
  const canManage =
    actor.role === "admin" || (actor.role === "operator" && actor.nodeId === nodeId);

  if (!canManage) {
    throw new Error("Anda tidak punya akses untuk memperbarui lokasi ini.");
  }

  const store = await getHydratedStore();
  const node = store.nodes.find((item) => item.id === nodeId);

  if (!node) {
    throw new Error("Lokasi penyaluran tidak ditemukan.");
  }

  node.name = input.name;
  node.type = input.type;
  node.area = input.area;
  node.contactName = input.contactName;
  node.contactPhone = input.contactPhone;
  node.imageUrl = input.imageUrl ?? node.imageUrl;

  pushLog(store, {
    title: "Profil lokasi diperbarui",
    description: `${node.name} kini memakai detail terbaru.`,
    entityType: "system",
    entityId: node.id,
    actor: actor.name,
    tone: "info",
  });

  await writeStore(store);
  return node;
}

export async function createSponsorTransaction(
  input: CreateSponsorTransactionInput,
) {
  const store = await getHydratedStore();
  const portion = store.portions.find((item) => item.id === input.portionId);

  if (!portion) {
    throw new Error("Porsi tidak ditemukan.");
  }

  const merchant = store.merchants.find((item) => item.id === portion.merchantId);

  if (!merchant?.active) {
    throw new Error("Merchant untuk paket ini sedang tidak aktif.");
  }

  const availableToReserve =
    portion.availablePortions - getPendingReservedPortions(store, portion.id);

  if (input.sponsoredPortions <= 0 || input.sponsoredPortions > availableToReserve) {
    throw new Error("Jumlah porsi melebihi stok yang masih bisa disponsori.");
  }

  const transactionId = `tx-${randomUUID().slice(0, 8)}`;
  const amount = input.sponsoredPortions * portion.sponsorPrice;
  const invoice = await createMayarInvoice({
    transactionId,
    donorName: input.donorName,
    donorEmail: input.donorEmail,
    donorPhone: input.donorPhone,
    amount,
    quantity: input.sponsoredPortions,
    unitPrice: portion.sponsorPrice,
    title: portion.title,
  });

  const transaction: Transaction = {
    id: transactionId,
    portionId: portion.id,
    donorName: input.donorName,
    donorEmail: input.donorEmail.toLowerCase().trim(),
    donorPhone: input.donorPhone,
    sponsoredPortions: input.sponsoredPortions,
    amount,
    status: "pending",
    paymentChannel: invoice.paymentChannel,
    mayarInvoiceId: invoice.invoiceId,
    mayarTransactionId: invoice.mayarTransactionId,
    mayarPaymentUrl: invoice.paymentUrl,
    checkoutPath: invoice.checkoutPath,
    mayarQrString: invoice.qrString,
    createdAt: nowIso(),
    expiresAt: invoice.expiresAt,
    notes: "Pembayaran bantuan dibuat dari beranda Iftar Relay.",
  };

  store.transactions.unshift(transaction);

  pushLog(store, {
    title: "Pembayaran bantuan dibuat",
    description: `${input.donorName} menyiapkan pembayaran untuk ${input.sponsoredPortions} porsi.`,
    entityType: "transaction",
    entityId: transaction.id,
    actor: "Halaman pembayaran",
    tone: "info",
  });

  await writeStore(store);
  return transaction;
}

export async function settleTransactionPaymentByInvoice(
  invoiceId: string,
  options?: {
    paymentMethod?: Transaction["paymentChannel"];
    paidAt?: string;
    mayarTransactionId?: string;
    webhookPayload?: string;
  },
) {
  const store = await getHydratedStore();
  const transaction = findTransactionByMayarReference(store, invoiceId);

  if (!transaction) {
    throw new Error("Pembayaran Mayar tidak ditemukan.");
  }

  activatePaidTransaction(store, transaction, options);

  await writeStore(store);
  return transaction;
}

export async function syncTransactionWithMayar(transactionId: string) {
  if (!isMayarConfigured()) {
    throw new Error("Kredensial Mayar belum diatur di environment.");
  }

  const store = await getHydratedStore();
  const transaction = store.transactions.find((item) => item.id === transactionId);

  if (!transaction) {
    throw new Error("Transaksi tidak ditemukan.");
  }

  const detail = await fetchMayarInvoiceDetail(transaction.mayarInvoiceId);
  transaction.mayarPaymentUrl = detail.paymentUrl ?? transaction.mayarPaymentUrl;
  transaction.mayarTransactionId =
    detail.mayarTransactionId ?? transaction.mayarTransactionId;
  transaction.mayarWebhookPayload = detail.rawPayload;

  const mappedStatus = mapMayarStatusToTransaction(detail.status);

  if (mappedStatus === "paid") {
    activatePaidTransaction(store, transaction, {
      paymentMethod: detail.paymentMethod,
      paidAt: detail.paidAt,
      mayarTransactionId: detail.mayarTransactionId,
      webhookPayload: detail.rawPayload,
    });
  } else {
    transaction.status = mappedStatus;
  }

  await writeStore(store);
  return transaction;
}

export async function processMayarWebhook(payload: unknown) {
  const event = extractMayarWebhookEvent(payload);
  const reference = event.mayarTransactionId ?? event.mayarInvoiceId;

  if (!reference) {
    throw new Error("Konfirmasi Mayar tidak memiliki referensi transaksi.");
  }

  if (!event.eventName.includes("payment.received")) {
    return null;
  }

  const transaction = await settleTransactionPaymentByInvoice(reference, {
    mayarTransactionId: event.mayarTransactionId,
    webhookPayload: event.rawPayload,
  });

  return transaction;
}

export async function getTransactionById(transactionId: string) {
  const store = await getHydratedStore();
  return store.transactions.find((item) => item.id === transactionId) ?? null;
}

export async function verifyVoucherCode(input: VerifyVoucherInput) {
  const store = await getHydratedStore();
  const voucher = store.vouchers.find(
    (item) => item.code.toUpperCase() === input.code.toUpperCase().trim(),
  );

  if (!voucher) {
    throw new Error("Voucher tidak ditemukan.");
  }

  if (voucher.status === "redeemed") {
    throw new Error("Voucher ini sudah pernah ditebus.");
  }

  if (voucher.status === "expired") {
    throw new Error("Voucher ini sudah kedaluwarsa.");
  }

  const portion = store.portions.find((item) => item.id === voucher.portionId);
  const distribution = store.distributions.find(
    (item) => item.voucherId === voucher.id,
  );

  if (!portion || !distribution) {
    throw new Error("Data distribusi voucher tidak lengkap.");
  }

  voucher.status = "redeemed";
  voucher.redeemedAt = nowIso();
  voucher.proofActivityId = distribution.id;

  portion.distributedPortions += voucher.portionCount;
  portion.lastUpdatedAt = nowIso();

  distribution.status = "completed";
  distribution.actorName = input.actorName;
  distribution.actorRole = "Petugas lapangan";
  distribution.updatedAt = nowIso();
  distribution.note = "Voucher diperiksa di lapangan dan paket sudah diterima.";

  portion.status = derivePortionStatus(store, portion);

  pushLog(store, {
    title: "Voucher diperiksa",
    description: `${voucher.code} berhasil ditebus untuk ${voucher.portionCount} porsi.`,
    entityType: "voucher",
    entityId: voucher.id,
    actor: input.actorName,
    tone: "success",
  });

  await writeStore(store);
  return voucher;
}

export async function attachProofToDistribution(input: AttachProofInput) {
  const store = await getHydratedStore();
  const activity = store.distributions.find((item) => item.id === input.activityId);

  if (!activity) {
    throw new Error("Tugas distribusi tidak ditemukan.");
  }

  activity.actorName = input.actorName;
  activity.actorRole = "Petugas lapangan";
  activity.updatedAt = nowIso();
  activity.note = input.note;
  activity.proofImageUrl = input.proofImageUrl;
  activity.status = activity.status === "completed" ? "completed" : "verified";

  pushLog(store, {
    title: "Dokumentasi lapangan diunggah",
    description: `Dokumentasi baru masuk untuk tugas ${activity.locationLabel}.`,
    entityType: "distribution",
    entityId: activity.id,
    actor: input.actorName,
    tone: "info",
  });

  await writeStore(store);
  return activity;
}

export async function updatePortion(
  actor: AppUser,
  portionId: string,
  input: UpdatePortionInput,
) {
  const store = await getHydratedStore();
  const portion = store.portions.find((item) => item.id === portionId);

  if (!portion) {
    throw new Error("Porsi tidak ditemukan.");
  }

  if (!canManagePortion(actor, portion)) {
    throw new Error("Anda tidak punya akses untuk memperbarui paket ini.");
  }

  portion.title = input.title;
  portion.description = input.description;
  portion.pickupStartAt = input.pickupStartAt;
  portion.pickupEndAt = input.pickupEndAt;
  portion.expiresAt = input.pickupEndAt;
  portion.assignedNodeId = input.assignedNodeId;
  portion.tags = input.tags?.length ? input.tags.map((tag) => toTitleCase(tag)) : portion.tags;
  portion.imageUrl = input.imageUrl ?? portion.imageUrl;
  portion.lastUpdatedAt = nowIso();

  pushLog(store, {
    title: "Paket diperbarui",
    description: `${portion.title} mendapat pembaruan waktu pengambilan dan lokasi penyaluran.`,
    entityType: "portion",
    entityId: portion.id,
    actor: actor.name,
    tone: "info",
  });

  await writeStore(store);
  return portion;
}

export async function deletePortion(actor: AppUser, portionId: string) {
  const store = await getHydratedStore();
  const portion = store.portions.find((item) => item.id === portionId);

  if (!portion) {
    throw new Error("Porsi tidak ditemukan.");
  }

  if (!canManagePortion(actor, portion)) {
    throw new Error("Anda tidak punya akses untuk menghapus paket ini.");
  }

  const hasLiveTransactions = store.transactions.some(
    (transaction) =>
      transaction.portionId === portionId &&
      (transaction.status === "pending" || transaction.status === "paid"),
  );

  if (hasLiveTransactions || portion.sponsoredPortions > 0 || portion.distributedPortions > 0) {
    throw new Error("Paket yang sudah punya transaksi atau penyaluran tidak bisa dihapus.");
  }

  store.portions = store.portions.filter((item) => item.id !== portionId);
  store.distributions = store.distributions.filter((item) => item.portionId !== portionId);
  store.vouchers = store.vouchers.filter((item) => item.portionId !== portionId);
  store.transactions = store.transactions.filter((item) => item.portionId !== portionId);

  pushLog(store, {
    title: "Paket dihapus",
    description: `${portion.title} dihapus dari daftar penyaluran.`,
    entityType: "portion",
    entityId: portion.id,
    actor: actor.name,
    tone: "warning",
  });

  await writeStore(store);
  return portion;
}

export async function updatePortionStatus(input: UpdatePortionStatusInput) {
  const store = await getHydratedStore();
  const portion = applyPortionStatusUpdate(store, input);

  await writeStore(store);
  return portion;
}

export async function requestPortionStatusApproval(
  actor: AppUser,
  portionId: string,
  status: PortionStatus,
  requestNote?: string,
) {
  const store = await getHydratedStore();
  const portion = store.portions.find((item) => item.id === portionId);

  if (!portion) {
    throw new Error("Porsi tidak ditemukan.");
  }

  if (!canManagePortion(actor, portion)) {
    throw new Error("Anda tidak punya akses untuk mengajukan perubahan paket ini.");
  }

  const request = createApprovalRequest(store, {
    actionType: "portion-status",
    entityType: "portion",
    entityId: portion.id,
    entityLabel: portion.title,
    requestedByName: actor.name,
    requestedByRole: actor.role,
    requestNote,
    payload: { status },
  });

  pushLog(store, {
    title: "Permintaan perubahan status diajukan",
    description: `${actor.name} mengajukan perubahan status ${portion.title} ke ${status}.`,
    entityType: "system",
    entityId: request.id,
    actor: actor.name,
    tone: "info",
  });

  await writeStore(store);
  return request;
}

export async function updateDistributionStatus(input: UpdateDistributionStatusInput) {
  const store = await getHydratedStore();
  const activity = store.distributions.find((item) => item.id === input.activityId);

  if (!activity) {
    throw new Error("Aktivitas distribusi tidak ditemukan.");
  }

  activity.status = input.status as DistributionStatus;
  activity.actorName = input.actorName;
  activity.updatedAt = nowIso();

  pushLog(store, {
    title: "Status penyaluran diperbarui",
    description: `Tugas di ${activity.locationLabel} baru saja diperbarui.`,
    entityType: "distribution",
    entityId: activity.id,
    actor: input.actorName,
    tone: input.status === "completed" ? "success" : "info",
  });

  await writeStore(store);
  return activity;
}

export async function rerouteDistribution(
  actor: AppUser,
  input: RerouteDistributionInput,
) {
  if (actor.role !== "admin") {
    throw new Error("Pengalihan manual hanya tersedia untuk pengelola pusat.");
  }

  const store = await getHydratedStore();
  const activity = applyDistributionReroute(store, actor, input);

  await writeStore(store);
  return activity;
}

export async function requestDistributionRerouteApproval(
  actor: AppUser,
  input: RerouteDistributionInput,
) {
  const store = await getHydratedStore();
  const activity = store.distributions.find((item) => item.id === input.activityId);

  if (!activity) {
    throw new Error("Aktivitas distribusi tidak ditemukan.");
  }

  if (!canManageDistribution(actor, activity)) {
    throw new Error("Anda tidak punya akses untuk mengajukan pengalihan tugas ini.");
  }

  const nextNode = store.nodes.find((item) => item.id === input.nodeId);

  if (!nextNode) {
    throw new Error("Lokasi penyaluran tujuan tidak ditemukan.");
  }

  const request = createApprovalRequest(store, {
    actionType: "distribution-reroute",
    entityType: "distribution",
    entityId: activity.id,
    entityLabel: activity.locationLabel,
    requestedByName: actor.name,
    requestedByRole: actor.role,
    requestNote: input.note,
    payload: {
      nodeId: nextNode.id,
      note: input.note ?? "",
    },
  });

  pushLog(store, {
    title: "Permintaan pengalihan diajukan",
    description: `${actor.name} mengajukan pengalihan ${activity.locationLabel} ke ${nextNode.name}.`,
    entityType: "system",
    entityId: request.id,
    actor: actor.name,
    tone: "info",
  });

  await writeStore(store);
  return request;
}

export async function updateMerchantActiveStatus(
  actor: AppUser,
  merchantId: string,
  active: boolean,
) {
  const store = await getHydratedStore();
  const merchant = store.merchants.find((item) => item.id === merchantId);

  if (!merchant) {
    throw new Error("Merchant tidak ditemukan.");
  }

  merchant.active = active;

  pushLog(store, {
    title: active ? "Merchant diaktifkan" : "Merchant dinonaktifkan",
    description: `${merchant.name} kini ${active ? "aktif dan bisa menerima bantuan baru" : "dijeda dari bantuan baru"}.`,
    entityType: "system",
    entityId: merchant.id,
    actor: actor.name,
    tone: active ? "success" : "warning",
  });

  await writeStore(store);
  return merchant;
}

export async function updateNodeActiveStatus(
  actor: AppUser,
  nodeId: string,
  active: boolean,
) {
  const store = await getHydratedStore();
  const node = store.nodes.find((item) => item.id === nodeId);

  if (!node) {
    throw new Error("Lokasi penyaluran tidak ditemukan.");
  }

  node.active = active;

  pushLog(store, {
    title: active ? "Lokasi penyaluran diaktifkan" : "Lokasi penyaluran dijeda",
    description: `${node.name} kini ${active ? "aktif untuk menerima penyaluran" : "tidak menerima penyaluran baru"}.`,
    entityType: "system",
    entityId: node.id,
    actor: actor.name,
    tone: active ? "success" : "warning",
  });

  await writeStore(store);
  return node;
}

export async function syncPendingTransactions(actor: AppUser) {
  if (!isMayarConfigured()) {
    throw new Error("Kredensial Mayar belum diatur di environment.");
  }

  const store = await getHydratedStore();
  const scope = buildScope(store, actor);
  const scopedTransactionIds = new Set(scope.transactions.map((transaction) => transaction.id));
  const pendingTransactions = store.transactions.filter(
    (transaction) =>
      scopedTransactionIds.has(transaction.id) && transaction.status === "pending",
  );

  if (pendingTransactions.length === 0) {
    return {
      checkedCount: 0,
      paidCount: 0,
      expiredCount: 0,
      failedCount: 0,
      errorCount: 0,
    };
  }

  const results = await Promise.all(
    pendingTransactions.map(async (transaction) => {
      try {
        const detail = await fetchMayarInvoiceDetail(transaction.mayarInvoiceId);
        return { transactionId: transaction.id, detail };
      } catch (error) {
        return {
          transactionId: transaction.id,
          error: error instanceof Error ? error.message : "Gagal mengambil detail pembayaran.",
        };
      }
    }),
  );

  let checkedCount = 0;
  let paidCount = 0;
  let expiredCount = 0;
  let failedCount = 0;
  let errorCount = 0;

  for (const result of results) {
    const transaction = store.transactions.find((item) => item.id === result.transactionId);

    if (!transaction) {
      continue;
    }

    if ("error" in result) {
      errorCount += 1;
      continue;
    }

    checkedCount += 1;
    transaction.mayarPaymentUrl = result.detail.paymentUrl ?? transaction.mayarPaymentUrl;
    transaction.mayarTransactionId =
      result.detail.mayarTransactionId ?? transaction.mayarTransactionId;
    transaction.mayarWebhookPayload = result.detail.rawPayload;

    const mappedStatus = mapMayarStatusToTransaction(result.detail.status);

    if (mappedStatus === "paid") {
      activatePaidTransaction(store, transaction, {
        paymentMethod: result.detail.paymentMethod,
        paidAt: result.detail.paidAt,
        mayarTransactionId: result.detail.mayarTransactionId,
        webhookPayload: result.detail.rawPayload,
      });
      paidCount += 1;
      continue;
    }

    transaction.status = mappedStatus;

    if (mappedStatus === "expired") {
      expiredCount += 1;
    }

    if (mappedStatus === "failed") {
      failedCount += 1;
    }
  }

  pushLog(store, {
    title: "Pembaruan pembayaran massal dijalankan",
    description: `${checkedCount} pembayaran dicek, ${paidCount} lunas, ${expiredCount} kedaluwarsa, ${failedCount} gagal, ${errorCount} bermasalah.`,
    entityType: "system",
    entityId: "bulk-mayar-sync",
    actor: actor.name,
    tone: paidCount > 0 ? "success" : "info",
  });

  await writeStore(store);

  return {
    checkedCount,
    paidCount,
    expiredCount,
    failedCount,
    errorCount,
  };
}

export async function approveApprovalRequest(
  actor: AppUser,
  requestId: string,
  reviewNote?: string,
) {
  if (actor.role !== "admin") {
    throw new Error("Hanya pengelola pusat yang dapat menyetujui permintaan.");
  }

  const store = await getHydratedStore();
  const request = store.approvalRequests.find((item) => item.id === requestId);

  if (!request) {
    throw new Error("Permintaan tidak ditemukan.");
  }

  if (request.status !== "pending") {
    throw new Error("Permintaan ini sudah diproses.");
  }

  if (request.actionType === "portion-status") {
    applyPortionStatusUpdate(store, {
      portionId: request.entityId,
      status: request.payload.status as PortionStatus,
      actorName: actor.name,
    });
  }

  if (request.actionType === "distribution-reroute") {
    applyDistributionReroute(store, actor, {
      activityId: request.entityId,
      nodeId: request.payload.nodeId,
      actorName: actor.name,
      note: request.payload.note || request.requestNote,
    });
  }

  request.status = "approved";
  request.reviewedAt = nowIso();
  request.reviewedByName = actor.name;
  request.reviewNote = reviewNote;

  pushLog(store, {
    title: "Permintaan disetujui",
    description: `Perubahan untuk ${request.entityLabel} telah disetujui.`,
    entityType: "system",
    entityId: request.id,
    actor: actor.name,
    tone: "success",
  });

  await writeStore(store);
  return request;
}

export async function rejectApprovalRequest(
  actor: AppUser,
  requestId: string,
  reviewNote?: string,
) {
  if (actor.role !== "admin") {
    throw new Error("Hanya pengelola pusat yang dapat menolak permintaan.");
  }

  const store = await getHydratedStore();
  const request = store.approvalRequests.find((item) => item.id === requestId);

  if (!request) {
    throw new Error("Permintaan tidak ditemukan.");
  }

  if (request.status !== "pending") {
    throw new Error("Permintaan ini sudah diproses.");
  }

  request.status = "rejected";
  request.reviewedAt = nowIso();
  request.reviewedByName = actor.name;
  request.reviewNote = reviewNote;

  pushLog(store, {
    title: "Permintaan ditolak",
    description: `Perubahan untuk ${request.entityLabel} ditolak.`,
    entityType: "system",
    entityId: request.id,
    actor: actor.name,
    tone: "warning",
  });

  await writeStore(store);
  return request;
}

export async function resetDemoData() {
  return resetRawStore();
}
