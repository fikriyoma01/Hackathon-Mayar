import mysql, { type Pool } from "mysql2/promise";

const DB_HOST = process.env.DB_HOST ?? "127.0.0.1";
const DB_PORT = Number(process.env.DB_PORT ?? 3306);
const DB_USER = process.env.DB_USER ?? "root";
const DB_PASSWORD = process.env.DB_PASSWORD ?? "";
const DB_NAME = process.env.DB_NAME ?? "iftar_relay";

const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS app_meta (
    id TINYINT PRIMARY KEY,
    version INT NOT NULL,
    last_updated_at DATETIME NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(191) NOT NULL,
    email VARCHAR(191) NOT NULL UNIQUE,
    password VARCHAR(191) NOT NULL,
    role VARCHAR(32) NOT NULL,
    avatar_url VARCHAR(255) NULL,
    merchant_id VARCHAR(64) NULL,
    node_id VARCHAR(64) NULL
  )`,
  `CREATE TABLE IF NOT EXISTS merchants (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(191) NOT NULL,
    owner_name VARCHAR(191) NOT NULL,
    area VARCHAR(191) NOT NULL,
    active TINYINT(1) NOT NULL,
    phone VARCHAR(64) NOT NULL,
    eta_minutes INT NOT NULL,
    rating DECIMAL(3, 2) NOT NULL,
    specialty VARCHAR(191) NOT NULL,
    logo_url VARCHAR(255) NULL,
    image_url VARCHAR(255) NULL
  )`,
  `CREATE TABLE IF NOT EXISTS distribution_nodes (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(191) NOT NULL,
    type VARCHAR(32) NOT NULL,
    area VARCHAR(191) NOT NULL,
    contact_name VARCHAR(191) NOT NULL,
    contact_phone VARCHAR(64) NOT NULL,
    active TINYINT(1) NOT NULL,
    image_url VARCHAR(255) NULL
  )`,
  `CREATE TABLE IF NOT EXISTS portions (
    id VARCHAR(64) PRIMARY KEY,
    merchant_id VARCHAR(64) NOT NULL,
    title VARCHAR(191) NOT NULL,
    description TEXT NOT NULL,
    total_portions INT NOT NULL,
    available_portions INT NOT NULL,
    sponsored_portions INT NOT NULL,
    distributed_portions INT NOT NULL,
    price INT NOT NULL,
    sponsor_price INT NOT NULL,
    pickup_start_at DATETIME NOT NULL,
    pickup_end_at DATETIME NOT NULL,
    expires_at DATETIME NOT NULL,
    status VARCHAR(32) NOT NULL,
    assigned_node_id VARCHAR(64) NOT NULL,
    tags_json LONGTEXT NOT NULL,
    last_updated_at DATETIME NOT NULL,
    image_url VARCHAR(255) NULL
  )`,
  `CREATE TABLE IF NOT EXISTS transactions (
    id VARCHAR(64) PRIMARY KEY,
    portion_id VARCHAR(64) NOT NULL,
    donor_name VARCHAR(191) NOT NULL,
    donor_email VARCHAR(191) NOT NULL,
    donor_phone VARCHAR(64) NOT NULL,
    sponsored_portions INT NOT NULL,
    amount INT NOT NULL,
    status VARCHAR(32) NOT NULL,
    payment_channel VARCHAR(64) NOT NULL,
    mayar_invoice_id VARCHAR(191) NOT NULL UNIQUE,
    mayar_transaction_id VARCHAR(191) NULL,
    mayar_payment_url TEXT NOT NULL,
    checkout_path VARCHAR(255) NOT NULL,
    mayar_qr_string TEXT NOT NULL,
    created_at DATETIME NOT NULL,
    expires_at DATETIME NOT NULL,
    paid_at DATETIME NULL,
    voucher_id VARCHAR(64) NULL,
    notes TEXT NULL,
    mayar_webhook_payload LONGTEXT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS vouchers (
    id VARCHAR(64) PRIMARY KEY,
    code VARCHAR(64) NOT NULL UNIQUE,
    portion_id VARCHAR(64) NOT NULL,
    transaction_id VARCHAR(64) NOT NULL,
    merchant_id VARCHAR(64) NOT NULL,
    assigned_node_id VARCHAR(64) NOT NULL,
    recipient_alias VARCHAR(191) NOT NULL,
    portion_count INT NOT NULL,
    status VARCHAR(32) NOT NULL,
    expires_at DATETIME NOT NULL,
    qr_payload TEXT NOT NULL,
    created_at DATETIME NOT NULL,
    redeemed_at DATETIME NULL,
    proof_activity_id VARCHAR(64) NULL,
    image_url VARCHAR(255) NULL
  )`,
  `CREATE TABLE IF NOT EXISTS distribution_activities (
    id VARCHAR(64) PRIMARY KEY,
    voucher_id VARCHAR(64) NULL,
    portion_id VARCHAR(64) NOT NULL,
    node_id VARCHAR(64) NOT NULL,
    actor_name VARCHAR(191) NOT NULL,
    actor_role VARCHAR(191) NOT NULL,
    location_label VARCHAR(191) NOT NULL,
    status VARCHAR(32) NOT NULL,
    note TEXT NOT NULL,
    task_due_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    proof_image_url VARCHAR(255) NULL,
    route_image_url VARCHAR(255) NULL
  )`,
  `CREATE TABLE IF NOT EXISTS activity_logs (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(191) NOT NULL,
    description TEXT NOT NULL,
    entity_type VARCHAR(32) NOT NULL,
    entity_id VARCHAR(64) NOT NULL,
    actor VARCHAR(191) NOT NULL,
    timestamp DATETIME NOT NULL,
    tone VARCHAR(32) NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS approval_requests (
    id VARCHAR(64) PRIMARY KEY,
    action_type VARCHAR(64) NOT NULL,
    entity_type VARCHAR(32) NOT NULL,
    entity_id VARCHAR(64) NOT NULL,
    entity_label VARCHAR(191) NOT NULL,
    requested_by_name VARCHAR(191) NOT NULL,
    requested_by_role VARCHAR(32) NOT NULL,
    request_note TEXT NULL,
    payload_json LONGTEXT NOT NULL,
    status VARCHAR(32) NOT NULL,
    created_at DATETIME NOT NULL,
    reviewed_at DATETIME NULL,
    reviewed_by_name VARCHAR(191) NULL,
    review_note TEXT NULL
  )`,
];

let pool: Pool | null = null;
let ensurePromise: Promise<void> | null = null;

function getConfig() {
  return {
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    namedPlaceholders: true,
    timezone: "Z",
    dateStrings: true,
  } as const;
}

export function getDbPool() {
  if (!pool) {
    pool = mysql.createPool(getConfig());
  }

  return pool;
}

export async function ensureDatabase() {
  if (ensurePromise) {
    return ensurePromise;
  }

  ensurePromise = (async () => {
    const connection = await mysql.createConnection({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      timezone: "Z",
    });

    try {
      await connection.query(
        `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
      );
    } finally {
      await connection.end();
    }

    const database = getDbPool();
    for (const statement of schemaStatements) {
      await database.query(statement);
    }
  })().catch((error) => {
    ensurePromise = null;
    throw error;
  });

  return ensurePromise;
}

export function getDbConfig() {
  return {
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    database: DB_NAME,
  };
}

export async function closeDbPool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
