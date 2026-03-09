import type { PoolConnection, RowDataPacket } from "mysql2/promise";

import { getDbPool, ensureDatabase } from "@/lib/db";
import { createSeedStore } from "@/lib/seed";
import type { AppStore } from "@/lib/types";

function toSqlDateTime(value: string) {
  return new Date(value).toISOString().slice(0, 19).replace("T", " ");
}

function fromSqlDateTime(value: string | null | undefined) {
  if (!value) {
    return undefined;
  }

  return new Date(`${value.replace(" ", "T")}Z`).toISOString();
}

function parseJsonArray(value: string) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseJsonObject(value: string) {
  try {
    const parsed = JSON.parse(value);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

async function clearTables(connection: PoolConnection) {
  await connection.query("DELETE FROM approval_requests");
  await connection.query("DELETE FROM activity_logs");
  await connection.query("DELETE FROM distribution_activities");
  await connection.query("DELETE FROM vouchers");
  await connection.query("DELETE FROM transactions");
  await connection.query("DELETE FROM portions");
  await connection.query("DELETE FROM distribution_nodes");
  await connection.query("DELETE FROM merchants");
  await connection.query("DELETE FROM users");
  await connection.query("DELETE FROM app_meta");
}

async function writeStoreWithConnection(connection: PoolConnection, store: AppStore) {
  const nextStore: AppStore = {
    ...store,
    meta: {
      ...store.meta,
      lastUpdatedAt: new Date().toISOString(),
    },
  };

  await clearTables(connection);

  await connection.query(
    "INSERT INTO app_meta (id, version, last_updated_at) VALUES (1, ?, ?)",
    [nextStore.meta.version, toSqlDateTime(nextStore.meta.lastUpdatedAt)],
  );

  for (const user of nextStore.users) {
    await connection.query(
      `INSERT INTO users
        (id, name, email, password, role, avatar_url, merchant_id, node_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user.id,
        user.name,
        user.email,
        user.password,
        user.role,
        user.avatarUrl ?? null,
        user.merchantId ?? null,
        user.nodeId ?? null,
      ],
    );
  }

  for (const merchant of nextStore.merchants) {
    await connection.query(
      `INSERT INTO merchants
        (id, name, owner_name, area, active, phone, eta_minutes, rating, specialty, logo_url, image_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        merchant.id,
        merchant.name,
        merchant.ownerName,
        merchant.area,
        merchant.active ? 1 : 0,
        merchant.phone,
        merchant.etaMinutes,
        merchant.rating,
        merchant.specialty,
        merchant.logoUrl ?? null,
        merchant.imageUrl ?? null,
      ],
    );
  }

  for (const node of nextStore.nodes) {
    await connection.query(
      `INSERT INTO distribution_nodes
        (id, name, type, area, contact_name, contact_phone, active, image_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        node.id,
        node.name,
        node.type,
        node.area,
        node.contactName,
        node.contactPhone,
        node.active ? 1 : 0,
        node.imageUrl ?? null,
      ],
    );
  }

  for (const portion of nextStore.portions) {
    await connection.query(
      `INSERT INTO portions
        (id, merchant_id, title, description, total_portions, available_portions, sponsored_portions,
         distributed_portions, price, sponsor_price, pickup_start_at, pickup_end_at, expires_at,
         status, assigned_node_id, tags_json, last_updated_at, image_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        portion.id,
        portion.merchantId,
        portion.title,
        portion.description,
        portion.totalPortions,
        portion.availablePortions,
        portion.sponsoredPortions,
        portion.distributedPortions,
        portion.price,
        portion.sponsorPrice,
        toSqlDateTime(portion.pickupStartAt),
        toSqlDateTime(portion.pickupEndAt),
        toSqlDateTime(portion.expiresAt),
        portion.status,
        portion.assignedNodeId,
        JSON.stringify(portion.tags),
        toSqlDateTime(portion.lastUpdatedAt),
        portion.imageUrl ?? null,
      ],
    );
  }

  for (const transaction of nextStore.transactions) {
    await connection.query(
      `INSERT INTO transactions
        (id, portion_id, donor_name, donor_email, donor_phone, sponsored_portions, amount, status,
         payment_channel, mayar_invoice_id, mayar_transaction_id, mayar_payment_url, checkout_path,
         mayar_qr_string, created_at, expires_at, paid_at, voucher_id, notes, mayar_webhook_payload)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        transaction.id,
        transaction.portionId,
        transaction.donorName,
        transaction.donorEmail,
        transaction.donorPhone,
        transaction.sponsoredPortions,
        transaction.amount,
        transaction.status,
        transaction.paymentChannel,
        transaction.mayarInvoiceId,
        transaction.mayarTransactionId ?? null,
        transaction.mayarPaymentUrl,
        transaction.checkoutPath,
        transaction.mayarQrString,
        toSqlDateTime(transaction.createdAt),
        toSqlDateTime(transaction.expiresAt),
        transaction.paidAt ? toSqlDateTime(transaction.paidAt) : null,
        transaction.voucherId ?? null,
        transaction.notes ?? null,
        transaction.mayarWebhookPayload ?? null,
      ],
    );
  }

  for (const voucher of nextStore.vouchers) {
    await connection.query(
      `INSERT INTO vouchers
        (id, code, portion_id, transaction_id, merchant_id, assigned_node_id, recipient_alias,
         portion_count, status, expires_at, qr_payload, created_at, redeemed_at, proof_activity_id, image_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        voucher.id,
        voucher.code,
        voucher.portionId,
        voucher.transactionId,
        voucher.merchantId,
        voucher.assignedNodeId,
        voucher.recipientAlias,
        voucher.portionCount,
        voucher.status,
        toSqlDateTime(voucher.expiresAt),
        voucher.qrPayload,
        toSqlDateTime(voucher.createdAt),
        voucher.redeemedAt ? toSqlDateTime(voucher.redeemedAt) : null,
        voucher.proofActivityId ?? null,
        voucher.imageUrl ?? null,
      ],
    );
  }

  for (const activity of nextStore.distributions) {
    await connection.query(
      `INSERT INTO distribution_activities
        (id, voucher_id, portion_id, node_id, actor_name, actor_role, location_label, status,
         note, task_due_at, created_at, updated_at, proof_image_url, route_image_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        activity.id,
        activity.voucherId ?? null,
        activity.portionId,
        activity.nodeId,
        activity.actorName,
        activity.actorRole,
        activity.locationLabel,
        activity.status,
        activity.note,
        toSqlDateTime(activity.taskDueAt),
        toSqlDateTime(activity.createdAt),
        toSqlDateTime(activity.updatedAt),
        activity.proofImageUrl ?? null,
        activity.routeImageUrl ?? null,
      ],
    );
  }

  for (const log of nextStore.activityLogs) {
    await connection.query(
      `INSERT INTO activity_logs
        (id, title, description, entity_type, entity_id, actor, timestamp, tone)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        log.id,
        log.title,
        log.description,
        log.entityType,
        log.entityId,
        log.actor,
        toSqlDateTime(log.timestamp),
        log.tone,
      ],
    );
  }

  for (const request of nextStore.approvalRequests) {
    await connection.query(
      `INSERT INTO approval_requests
        (id, action_type, entity_type, entity_id, entity_label, requested_by_name, requested_by_role,
         request_note, payload_json, status, created_at, reviewed_at, reviewed_by_name, review_note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        request.id,
        request.actionType,
        request.entityType,
        request.entityId,
        request.entityLabel,
        request.requestedByName,
        request.requestedByRole,
        request.requestNote ?? null,
        JSON.stringify(request.payload),
        request.status,
        toSqlDateTime(request.createdAt),
        request.reviewedAt ? toSqlDateTime(request.reviewedAt) : null,
        request.reviewedByName ?? null,
        request.reviewNote ?? null,
      ],
    );
  }
}

let seedPromise: Promise<void> | null = null;

async function ensureSeeded() {
  await ensureDatabase();

  if (seedPromise) {
    return seedPromise;
  }

  seedPromise = (async () => {
    const pool = getDbPool();
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(*) AS total FROM users",
    );

    if (Number(rows[0]?.total ?? 0) === 0) {
      const connection = await pool.getConnection();

      try {
        await connection.beginTransaction();
        await writeStoreWithConnection(connection, createSeedStore());
        await connection.commit();
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    }
  })().catch((error) => {
    seedPromise = null;
    throw error;
  });

  return seedPromise;
}

export async function readStore(): Promise<AppStore> {
  await ensureSeeded();
  const pool = getDbPool();

  const [
    [metaRows],
    [userRows],
    [merchantRows],
    [nodeRows],
    [portionRows],
    [transactionRows],
    [voucherRows],
    [distributionRows],
    [logRows],
    [approvalRows],
  ] = await Promise.all([
    pool.query<RowDataPacket[]>("SELECT version, last_updated_at FROM app_meta WHERE id = 1"),
    pool.query<RowDataPacket[]>("SELECT * FROM users"),
    pool.query<RowDataPacket[]>("SELECT * FROM merchants"),
    pool.query<RowDataPacket[]>("SELECT * FROM distribution_nodes"),
    pool.query<RowDataPacket[]>("SELECT * FROM portions"),
    pool.query<RowDataPacket[]>("SELECT * FROM transactions"),
    pool.query<RowDataPacket[]>("SELECT * FROM vouchers"),
    pool.query<RowDataPacket[]>("SELECT * FROM distribution_activities"),
    pool.query<RowDataPacket[]>("SELECT * FROM activity_logs ORDER BY timestamp DESC"),
    pool.query<RowDataPacket[]>("SELECT * FROM approval_requests ORDER BY created_at DESC"),
  ]);

  return {
    meta: {
      version: Number(metaRows[0]?.version ?? 1),
      lastUpdatedAt:
        fromSqlDateTime(metaRows[0]?.last_updated_at) ?? new Date().toISOString(),
    },
    users: userRows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      password: row.password,
      role: row.role,
      avatarUrl: row.avatar_url ?? undefined,
      merchantId: row.merchant_id ?? undefined,
      nodeId: row.node_id ?? undefined,
    })),
    merchants: merchantRows.map((row) => ({
      id: row.id,
      name: row.name,
      ownerName: row.owner_name,
      area: row.area,
      active: Boolean(row.active),
      phone: row.phone,
      etaMinutes: Number(row.eta_minutes),
      rating: Number(row.rating),
      specialty: row.specialty,
      logoUrl: row.logo_url ?? undefined,
      imageUrl: row.image_url ?? undefined,
    })),
    nodes: nodeRows.map((row) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      area: row.area,
      contactName: row.contact_name,
      contactPhone: row.contact_phone,
      active: Boolean(row.active),
      imageUrl: row.image_url ?? undefined,
    })),
    portions: portionRows.map((row) => ({
      id: row.id,
      merchantId: row.merchant_id,
      title: row.title,
      description: row.description,
      totalPortions: Number(row.total_portions),
      availablePortions: Number(row.available_portions),
      sponsoredPortions: Number(row.sponsored_portions),
      distributedPortions: Number(row.distributed_portions),
      price: Number(row.price),
      sponsorPrice: Number(row.sponsor_price),
      pickupStartAt: fromSqlDateTime(row.pickup_start_at) ?? new Date().toISOString(),
      pickupEndAt: fromSqlDateTime(row.pickup_end_at) ?? new Date().toISOString(),
      expiresAt: fromSqlDateTime(row.expires_at) ?? new Date().toISOString(),
      status: row.status,
      assignedNodeId: row.assigned_node_id,
      tags: parseJsonArray(row.tags_json),
      lastUpdatedAt:
        fromSqlDateTime(row.last_updated_at) ?? new Date().toISOString(),
      imageUrl: row.image_url ?? undefined,
    })),
    transactions: transactionRows.map((row) => ({
      id: row.id,
      portionId: row.portion_id,
      donorName: row.donor_name,
      donorEmail: row.donor_email,
      donorPhone: row.donor_phone,
      sponsoredPortions: Number(row.sponsored_portions),
      amount: Number(row.amount),
      status: row.status,
      paymentChannel: row.payment_channel,
      mayarInvoiceId: row.mayar_invoice_id,
      mayarTransactionId: row.mayar_transaction_id ?? undefined,
      mayarPaymentUrl: row.mayar_payment_url,
      checkoutPath: row.checkout_path,
      mayarQrString: row.mayar_qr_string,
      createdAt: fromSqlDateTime(row.created_at) ?? new Date().toISOString(),
      expiresAt: fromSqlDateTime(row.expires_at) ?? new Date().toISOString(),
      paidAt: fromSqlDateTime(row.paid_at),
      voucherId: row.voucher_id ?? undefined,
      notes: row.notes ?? undefined,
      mayarWebhookPayload: row.mayar_webhook_payload ?? undefined,
    })),
    vouchers: voucherRows.map((row) => ({
      id: row.id,
      code: row.code,
      portionId: row.portion_id,
      transactionId: row.transaction_id,
      merchantId: row.merchant_id,
      assignedNodeId: row.assigned_node_id,
      recipientAlias: row.recipient_alias,
      portionCount: Number(row.portion_count),
      status: row.status,
      expiresAt: fromSqlDateTime(row.expires_at) ?? new Date().toISOString(),
      qrPayload: row.qr_payload,
      createdAt: fromSqlDateTime(row.created_at) ?? new Date().toISOString(),
      redeemedAt: fromSqlDateTime(row.redeemed_at),
      proofActivityId: row.proof_activity_id ?? undefined,
      imageUrl: row.image_url ?? undefined,
    })),
    distributions: distributionRows.map((row) => ({
      id: row.id,
      voucherId: row.voucher_id ?? undefined,
      portionId: row.portion_id,
      nodeId: row.node_id,
      actorName: row.actor_name,
      actorRole: row.actor_role,
      locationLabel: row.location_label,
      status: row.status,
      note: row.note,
      taskDueAt: fromSqlDateTime(row.task_due_at) ?? new Date().toISOString(),
      createdAt: fromSqlDateTime(row.created_at) ?? new Date().toISOString(),
      updatedAt: fromSqlDateTime(row.updated_at) ?? new Date().toISOString(),
      proofImageUrl: row.proof_image_url ?? undefined,
      routeImageUrl: row.route_image_url ?? undefined,
    })),
    activityLogs: logRows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      entityType: row.entity_type,
      entityId: row.entity_id,
      actor: row.actor,
      timestamp: fromSqlDateTime(row.timestamp) ?? new Date().toISOString(),
      tone: row.tone,
    })),
    approvalRequests: approvalRows.map((row) => ({
      id: row.id,
      actionType: row.action_type,
      entityType: row.entity_type,
      entityId: row.entity_id,
      entityLabel: row.entity_label,
      requestedByName: row.requested_by_name,
      requestedByRole: row.requested_by_role,
      requestNote: row.request_note ?? undefined,
      payload: parseJsonObject(row.payload_json) as Record<string, string>,
      status: row.status,
      createdAt: fromSqlDateTime(row.created_at) ?? new Date().toISOString(),
      reviewedAt: fromSqlDateTime(row.reviewed_at),
      reviewedByName: row.reviewed_by_name ?? undefined,
      reviewNote: row.review_note ?? undefined,
    })),
  };
}

export async function writeStore(store: AppStore) {
  await ensureDatabase();
  const pool = getDbPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    await writeStoreWithConnection(connection, store);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function resetStore() {
  const seed = createSeedStore();
  await writeStore(seed);
  return seed;
}
