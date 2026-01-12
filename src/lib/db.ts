import Database from "better-sqlite3";
import path from "path";

// ============ TYPES ============

export interface PreferenceUpdate {
  id: number;
  email: string;
  interests: string[];
  frequency: string;
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  id: number;
  orderId: string;
  email: string;
  amountCents: number;
  currency: string;
  category: string;
  status: string;
  createdAt: string;
}

interface PreferenceDbRow {
  id: number;
  email: string;
  interests: string;
  frequency: string;
  created_at: string;
  updated_at: string;
}

interface OrderDbRow {
  id: number;
  order_id: string;
  email: string;
  amount_cents: number;
  currency: string;
  category: string;
  status: string;
  created_at: string;
}

// ============ DATABASE SETUP ============

const dbPath = path.join(process.cwd(), "data", "preferences.db");

function getDb() {
  const fs = require("fs");
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const db = new Database(dbPath);

  // Preferences table
  db.exec(`
    CREATE TABLE IF NOT EXISTS preference_updates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      interests TEXT NOT NULL,
      frequency TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_email ON preference_updates(email)
  `);

  // Orders table (new)
  db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL,
      amount_cents INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'usd',
      category TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'completed',
      created_at TEXT NOT NULL
    )
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(email)
  `);

  return db;
}

// ============ PREFERENCE FUNCTIONS ============

export function savePreference(params: {
  email: string;
  interests: string[];
  frequency: string;
}): PreferenceUpdate {
  const db = getDb();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO preference_updates (email, interests, frequency, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    params.email,
    JSON.stringify(params.interests),
    params.frequency,
    now,
    now
  );

  db.close();

  return {
    id: result.lastInsertRowid as number,
    email: params.email,
    interests: params.interests,
    frequency: params.frequency,
    createdAt: now,
    updatedAt: now,
  };
}

export function getRecentUpdates(limit: number = 10): PreferenceUpdate[] {
  const db = getDb();

  const stmt = db.prepare(`
    SELECT id, email, interests, frequency, created_at, updated_at
    FROM preference_updates
    ORDER BY created_at DESC
    LIMIT ?
  `);

  const rows = stmt.all(limit) as PreferenceDbRow[];
  db.close();

  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    interests: JSON.parse(row.interests),
    frequency: row.frequency,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export function getStats(): {
  totalUpdates: number;
  uniqueEmails: number;
  interestCounts: Record<string, number>;
  frequencyCounts: Record<string, number>;
} {
  const db = getDb();

  const totalStmt = db.prepare(`SELECT COUNT(*) as count FROM preference_updates`);
  const totalUpdates = (totalStmt.get() as { count: number }).count;

  const uniqueStmt = db.prepare(`SELECT COUNT(DISTINCT email) as count FROM preference_updates`);
  const uniqueEmails = (uniqueStmt.get() as { count: number }).count;

  const allStmt = db.prepare(`SELECT interests, frequency FROM preference_updates`);
  const allRows = allStmt.all() as { interests: string; frequency: string }[];

  db.close();

  const interestCounts: Record<string, number> = {};
  const frequencyCounts: Record<string, number> = {};

  for (const row of allRows) {
    const interests = JSON.parse(row.interests) as string[];
    for (const interest of interests) {
      interestCounts[interest] = (interestCounts[interest] || 0) + 1;
    }
    frequencyCounts[row.frequency] = (frequencyCounts[row.frequency] || 0) + 1;
  }

  return {
    totalUpdates,
    uniqueEmails,
    interestCounts,
    frequencyCounts,
  };
}

export function getPreferencesByEmail(email: string): PreferenceUpdate | null {
  const db = getDb();

  const stmt = db.prepare(`
    SELECT id, email, interests, frequency, created_at, updated_at
    FROM preference_updates
    WHERE email = ?
    ORDER BY created_at DESC
    LIMIT 1
  `);

  const row = stmt.get(email) as PreferenceDbRow | undefined;
  db.close();

  if (!row) return null;

  return {
    id: row.id,
    email: row.email,
    interests: JSON.parse(row.interests),
    frequency: row.frequency,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function getAllPreferences(): PreferenceUpdate[] {
  const db = getDb();

  const stmt = db.prepare(`
    SELECT id, email, interests, frequency, created_at, updated_at
    FROM preference_updates
    ORDER BY created_at DESC
  `);

  const rows = stmt.all() as PreferenceDbRow[];
  db.close();

  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    interests: JSON.parse(row.interests),
    frequency: row.frequency,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

// ============ ORDER FUNCTIONS ============

export function saveOrder(params: {
  orderId: string;
  email: string;
  amountCents: number;
  currency: string;
  category: string;
  status?: string;
}): Order {
  const db = getDb();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO orders (order_id, email, amount_cents, currency, category, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    params.orderId,
    params.email,
    params.amountCents,
    params.currency,
    params.category,
    params.status || "completed",
    now
  );

  db.close();

  return {
    id: result.lastInsertRowid as number,
    orderId: params.orderId,
    email: params.email,
    amountCents: params.amountCents,
    currency: params.currency,
    category: params.category,
    status: params.status || "completed",
    createdAt: now,
  };
}

export function getRecentOrders(limit: number = 10): Order[] {
  const db = getDb();

  const stmt = db.prepare(`
    SELECT id, order_id, email, amount_cents, currency, category, status, created_at
    FROM orders
    ORDER BY created_at DESC
    LIMIT ?
  `);

  const rows = stmt.all(limit) as OrderDbRow[];
  db.close();

  return rows.map((row) => ({
    id: row.id,
    orderId: row.order_id,
    email: row.email,
    amountCents: row.amount_cents,
    currency: row.currency,
    category: row.category,
    status: row.status,
    createdAt: row.created_at,
  }));
}

export function getOrderStats(): {
  totalOrders: number;
  totalRevenueCents: number;
  uniqueCustomers: number;
  avgOrderValueCents: number;
  categoryCounts: Record<string, number>;
  categoryRevenue: Record<string, number>;
} {
  const db = getDb();

  const countStmt = db.prepare(`SELECT COUNT(*) as count FROM orders WHERE status = 'completed'`);
  const totalOrders = (countStmt.get() as { count: number }).count;

  const revenueStmt = db.prepare(`SELECT COALESCE(SUM(amount_cents), 0) as total FROM orders WHERE status = 'completed'`);
  const totalRevenueCents = (revenueStmt.get() as { total: number }).total;

  const customersStmt = db.prepare(`SELECT COUNT(DISTINCT email) as count FROM orders`);
  const uniqueCustomers = (customersStmt.get() as { count: number }).count;

  const allStmt = db.prepare(`SELECT category, amount_cents FROM orders WHERE status = 'completed'`);
  const allRows = allStmt.all() as { category: string; amount_cents: number }[];

  db.close();

  const categoryCounts: Record<string, number> = {};
  const categoryRevenue: Record<string, number> = {};

  for (const row of allRows) {
    categoryCounts[row.category] = (categoryCounts[row.category] || 0) + 1;
    categoryRevenue[row.category] = (categoryRevenue[row.category] || 0) + row.amount_cents;
  }

  return {
    totalOrders,
    totalRevenueCents,
    uniqueCustomers,
    avgOrderValueCents: totalOrders > 0 ? Math.round(totalRevenueCents / totalOrders) : 0,
    categoryCounts,
    categoryRevenue,
  };
}

export function getOrdersByEmail(email: string): Order[] {
  const db = getDb();

  const stmt = db.prepare(`
    SELECT id, order_id, email, amount_cents, currency, category, status, created_at
    FROM orders
    WHERE email = ?
    ORDER BY created_at DESC
  `);

  const rows = stmt.all(email) as OrderDbRow[];
  db.close();

  return rows.map((row) => ({
    id: row.id,
    orderId: row.order_id,
    email: row.email,
    amountCents: row.amount_cents,
    currency: row.currency,
    category: row.category,
    status: row.status,
    createdAt: row.created_at,
  }));
}

export function getAllOrders(): Order[] {
  const db = getDb();

  const stmt = db.prepare(`
    SELECT id, order_id, email, amount_cents, currency, category, status, created_at
    FROM orders
    ORDER BY created_at DESC
  `);

  const rows = stmt.all() as OrderDbRow[];
  db.close();

  return rows.map((row) => ({
    id: row.id,
    orderId: row.order_id,
    email: row.email,
    amountCents: row.amount_cents,
    currency: row.currency,
    category: row.category,
    status: row.status,
    createdAt: row.created_at,
  }));
}
