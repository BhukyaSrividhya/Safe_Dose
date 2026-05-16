// src/services/database.js
// ─────────────────────────────────────────────────────────────
// SQLite is the SOURCE OF TRUTH for all patient data.
// Firebase is only the sync / push-notification layer.
// All reads and writes go through these functions first.
//
// FIX: initDatabase() must be called once from App.js at startup
// BEFORE auth listener or sync service start. All service
// functions wait on dbReadyPromise so they never query before
// tables exist.
// ─────────────────────────────────────────────────────────────

import SQLite from 'react-native-sqlite-storage';

SQLite.enablePromise(true);

let db = null;
let dbReadyResolve = null;
let dbReadyPromise = new Promise((res) => { dbReadyResolve = res; });

// ── Public: call once from App.js before anything else ────────

export const initDatabase = async () => {
  if (db) return db;
  try {
    db = await SQLite.openDatabase({ name: 'safedose.db', location: 'default' });
    await initSchema(db);
    dbReadyResolve(db);
    console.log('[DB] Database ready, all tables created');
    return db;
  } catch (err) {
    console.error('[DB] Failed to initialise database:', err);
    throw err;
  }
};

// ── Internal: every service function uses this ───────────────

export const getDatabase = async () => {
  if (db) return db;
  return dbReadyPromise;
};

// ── Schema creation ───────────────────────────────────────────

const initSchema = async (database) => {
  await database.executeSql(`
    CREATE TABLE IF NOT EXISTS medications (
      id            TEXT PRIMARY KEY,
      userId        TEXT NOT NULL,
      name          TEXT NOT NULL,
      dosage        TEXT NOT NULL,
      times         TEXT NOT NULL,
      isCritical    INTEGER DEFAULT 0,
      pillCount     INTEGER DEFAULT 0,
      active        INTEGER DEFAULT 1,
      createdAt     TEXT NOT NULL,
      updatedAt     TEXT NOT NULL
    );
  `);

  await database.executeSql(`
    CREATE TABLE IF NOT EXISTS doseLogs (
      id            TEXT PRIMARY KEY,
      medicationId  TEXT NOT NULL,
      userId        TEXT NOT NULL,
      scheduledTime TEXT NOT NULL,
      confirmedAt   TEXT,
      status        TEXT NOT NULL,
      synced        INTEGER DEFAULT 0,
      createdAt     TEXT NOT NULL
    );
  `);

  await database.executeSql(`
    CREATE TABLE IF NOT EXISTS pendingAlerts (
      id            TEXT PRIMARY KEY,
      userId        TEXT NOT NULL,
      doseLogId     TEXT NOT NULL,
      medicationId  TEXT NOT NULL,
      scheduledTime TEXT NOT NULL,
      sentAt        TEXT,
      status        TEXT DEFAULT 'pending',
      createdAt     TEXT NOT NULL
    );
  `);
};

// ── Medications CRUD ──────────────────────────────────────────

export const insertMedication = async (med) => {
  const database = await getDatabase();
  await database.executeSql(
    `INSERT INTO medications
      (id, userId, name, dosage, times, isCritical, pillCount, active, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    [
      med.id,
      med.userId,
      med.name,
      med.dosage,
      JSON.stringify(med.times),
      med.isCritical ? 1 : 0,
      med.pillCount || 0,
      med.createdAt,
      med.updatedAt,
    ],
  );
};

export const getMedicationsByUser = async (userId) => {
  const database = await getDatabase();
  const [result] = await database.executeSql(
    `SELECT * FROM medications WHERE userId = ? AND active = 1 ORDER BY name ASC`,
    [userId],
  );
  const rows = [];
  for (let i = 0; i < result.rows.length; i++) {
    const row = result.rows.item(i);
    rows.push({ ...row, times: JSON.parse(row.times), isCritical: !!row.isCritical });
  }
  return rows;
};

export const getMedicationById = async (id) => {
  const database = await getDatabase();
  const [result] = await database.executeSql(
    `SELECT * FROM medications WHERE id = ?`,
    [id],
  );
  if (result.rows.length === 0) return null;
  const row = result.rows.item(0);
  return { ...row, times: JSON.parse(row.times), isCritical: !!row.isCritical };
};

export const updateMedication = async (med) => {
  const database = await getDatabase();
  await database.executeSql(
    `UPDATE medications
     SET name=?, dosage=?, times=?, isCritical=?, pillCount=?, updatedAt=?
     WHERE id=?`,
    [
      med.name,
      med.dosage,
      JSON.stringify(med.times),
      med.isCritical ? 1 : 0,
      med.pillCount || 0,
      med.updatedAt,
      med.id,
    ],
  );
};

export const softDeleteMedication = async (id, updatedAt) => {
  const database = await getDatabase();
  await database.executeSql(
    `UPDATE medications SET active=0, updatedAt=? WHERE id=?`,
    [updatedAt, id],
  );
};

// ── Dose Logs ─────────────────────────────────────────────────

export const insertDoseLog = async (log) => {
  const database = await getDatabase();
  await database.executeSql(
    `INSERT OR IGNORE INTO doseLogs
      (id, medicationId, userId, scheduledTime, confirmedAt, status, synced, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
    [
      log.id,
      log.medicationId,
      log.userId,
      log.scheduledTime,
      log.confirmedAt || null,
      log.status,
      log.createdAt,
    ],
  );
};

export const updateDoseLogStatus = async (id, status, confirmedAt) => {
  const database = await getDatabase();
  await database.executeSql(
    `UPDATE doseLogs SET status=?, confirmedAt=?, synced=0 WHERE id=?`,
    [status, confirmedAt || null, id],
  );
};

export const getDoseLogById = async (id) => {
  const database = await getDatabase();
  const [result] = await database.executeSql(
    `SELECT * FROM doseLogs WHERE id = ?`,
    [id],
  );
  if (result.rows.length === 0) return null;
  return result.rows.item(0);
};

export const getDoseLogsByUser = async (userId, fromDate, toDate) => {
  const database = await getDatabase();
  const [result] = await database.executeSql(
    `SELECT dl.*, m.name as medName, m.dosage as medDosage
     FROM doseLogs dl
     JOIN medications m ON dl.medicationId = m.id
     WHERE dl.userId = ?
       AND dl.scheduledTime >= ?
       AND dl.scheduledTime <= ?
     ORDER BY dl.scheduledTime DESC`,
    [userId, fromDate, toDate],
  );
  const rows = [];
  for (let i = 0; i < result.rows.length; i++) {
    rows.push(result.rows.item(i));
  }
  return rows;
};

export const getUnsynedDoseLogs = async (userId) => {
  const database = await getDatabase();
  const [result] = await database.executeSql(
    `SELECT * FROM doseLogs WHERE userId=? AND synced=0`,
    [userId],
  );
  const rows = [];
  for (let i = 0; i < result.rows.length; i++) {
    rows.push(result.rows.item(i));
  }
  return rows;
};

export const markDoseLogSynced = async (id) => {
  const database = await getDatabase();
  await database.executeSql(`UPDATE doseLogs SET synced=1 WHERE id=?`, [id]);
};

// ── Pending Alerts ────────────────────────────────────────────

export const insertPendingAlert = async (alert) => {
  const database = await getDatabase();
  await database.executeSql(
    `INSERT INTO pendingAlerts
      (id, userId, doseLogId, medicationId, scheduledTime, status, createdAt)
     VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
    [
      alert.id,
      alert.userId,
      alert.doseLogId,
      alert.medicationId,
      alert.scheduledTime,
      alert.createdAt,
    ],
  );
};

export const markAlertSent = async (id, sentAt) => {
  const database = await getDatabase();
  await database.executeSql(
    `UPDATE pendingAlerts SET status='sent', sentAt=? WHERE id=?`,
    [sentAt, id],
  );
};

export const getPendingAlerts = async (userId) => {
  const database = await getDatabase();
  const [result] = await database.executeSql(
    `SELECT * FROM pendingAlerts WHERE userId=? AND status='pending'`,
    [userId],
  );
  const rows = [];
  for (let i = 0; i < result.rows.length; i++) {
    rows.push(result.rows.item(i));
  }
  return rows;
};

// ── Adherence Summary ─────────────────────────────────────────

export const getAdherenceSummary = async (userId, fromDate, toDate) => {
  const database = await getDatabase();
  const [result] = await database.executeSql(
    `SELECT status, COUNT(*) as count
     FROM doseLogs
     WHERE userId=? AND scheduledTime>=? AND scheduledTime<=?
     GROUP BY status`,
    [userId, fromDate, toDate],
  );
  const summary = { taken: 0, late: 0, missed: 0, pending: 0 };
  for (let i = 0; i < result.rows.length; i++) {
    const row = result.rows.item(i);
    summary[row.status] = row.count;
  }
  return summary;
};

// ── Cleanup ───────────────────────────────────────────────────

export const compressOldLogs = async (userId) => {
  const database = await getDatabase();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  await database.executeSql(
    `DELETE FROM doseLogs WHERE userId=? AND createdAt < ? AND synced=1`,
    [userId, cutoff.toISOString()],
  );
};
