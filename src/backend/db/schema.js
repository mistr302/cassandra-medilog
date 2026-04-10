import cassandra from 'cassandra-driver';
import config from '../config.js';

/**
 * Bootstraps the keyspace and all tables.
 * Uses a temporary client without keyspace to create the keyspace itself,
 * then switches to the real client for table creation.
 */
export async function initSchema() {
  const authProvider = config.cassandra.username
    ? new cassandra.auth.PlainTextAuthProvider(config.cassandra.username, config.cassandra.password)
    : undefined;

  // ── 1. Create keyspace ────────────────────────────────────────
  const bootstrap = new cassandra.Client({
    contactPoints: config.cassandra.contactPoints,
    localDataCenter: config.cassandra.localDataCenter,
    authProvider,
  });

  await bootstrap.connect();

  await bootstrap.execute(`
    CREATE KEYSPACE IF NOT EXISTS ${config.cassandra.keyspace}
    WITH replication = { 'class': 'SimpleStrategy', 'replication_factor': 1 }
  `);

  await bootstrap.shutdown();

  // ── 2. Create tables ──────────────────────────────────────────
  const client = new cassandra.Client({
    contactPoints: config.cassandra.contactPoints,
    localDataCenter: config.cassandra.localDataCenter,
    keyspace: config.cassandra.keyspace,
    authProvider,
  });

  await client.connect();

  const statements = [
    `CREATE TABLE IF NOT EXISTS doctors (
      doctor_id   UUID PRIMARY KEY,
      email       TEXT,
      password_hash TEXT,
      first_name  TEXT,
      last_name   TEXT,
      role        TEXT,
      specialization TEXT,
      created_at  TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS patients (
      patient_id  UUID PRIMARY KEY,
      first_name  TEXT,
      last_name   TEXT,
      birth_date  DATE,
      national_id TEXT,
      blood_type  TEXT,
      allergies   SET<TEXT>,
      phone       TEXT,
      email       TEXT,
      created_at  TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS examinations_by_patient (
      patient_id   UUID,
      examined_at  TIMESTAMP,
      exam_id      TIMEUUID,
      doctor_id    UUID,
      doctor_name  TEXT,
      diagnosis    TEXT,
      notes        TEXT,
      icd10_code   TEXT,
      follow_up    DATE,
      PRIMARY KEY ((patient_id), examined_at, exam_id)
    ) WITH CLUSTERING ORDER BY (examined_at DESC, exam_id DESC)`,

    `CREATE TABLE IF NOT EXISTS prescriptions_by_patient (
      patient_id    UUID,
      drug_id       UUID,
      drug_name     TEXT,
      dosage        TEXT,
      start_date    DATE,
      end_date      DATE,
      prescribed_by UUID,
      active        BOOLEAN,
      PRIMARY KEY ((patient_id), drug_id)
    )`,

    `CREATE TABLE IF NOT EXISTS medication_log (
      patient_id     UUID,
      drug_id        UUID,
      taken_at       TIMESTAMP,
      dose_taken     TEXT,
      administered_by UUID,
      notes          TEXT,
      PRIMARY KEY ((patient_id, drug_id), taken_at)
    ) WITH CLUSTERING ORDER BY (taken_at DESC)`,

    `CREATE TABLE IF NOT EXISTS patient_audit_log (
      patient_id UUID,
      event_at   TIMESTAMP,
      event_id   TIMEUUID,
      actor_id   UUID,
      actor_name TEXT,
      action     TEXT,
      entity_type TEXT,
      entity_id  UUID,
      changes    TEXT,
      ip_address TEXT,
      PRIMARY KEY ((patient_id), event_at, event_id)
    ) WITH CLUSTERING ORDER BY (event_at DESC, event_id DESC)`,

    `CREATE TABLE IF NOT EXISTS appointments_by_doctor_day (
      doctor_id    UUID,
      appt_date    DATE,
      start_time   TIME,
      appt_id      UUID,
      patient_id   UUID,
      patient_name TEXT,
      reason       TEXT,
      status       TEXT,
      PRIMARY KEY ((doctor_id, appt_date), start_time, appt_id)
    ) WITH CLUSTERING ORDER BY (start_time ASC, appt_id ASC)`,

    `CREATE TABLE IF NOT EXISTS drug_interactions (
      drug_id_a   UUID,
      drug_id_b   UUID,
      severity    TEXT,
      description TEXT,
      PRIMARY KEY ((drug_id_a), drug_id_b)
    )`,

    `CREATE TABLE IF NOT EXISTS prescription_stats (
      month     TEXT,
      drug_id   UUID,
      count     COUNTER,
      PRIMARY KEY ((month), drug_id)
    )`,

    `CREATE TABLE IF NOT EXISTS drugs (
      drug_id     UUID PRIMARY KEY,
      name        TEXT,
      generic_name TEXT,
      category    TEXT,
      description TEXT,
      created_at  TIMESTAMP
    )`,
  ];

  for (const stmt of statements) {
    await client.execute(stmt);
  }

  // Secondary index on patients.allergies for Q4
  await client.execute(`
    CREATE INDEX IF NOT EXISTS idx_patients_allergies
    ON patients (allergies)
  `);

  // Secondary index on doctors.email for login lookup
  await client.execute(`
    CREATE INDEX IF NOT EXISTS idx_doctors_email
    ON doctors (email)
  `);

  // Secondary index on patients.last_name for search
  await client.execute(`
    CREATE INDEX IF NOT EXISTS idx_patients_last_name
    ON patients (last_name)
  `);

  // Secondary index on patients.national_id for search
  await client.execute(`
    CREATE INDEX IF NOT EXISTS idx_patients_national_id
    ON patients (national_id)
  `);

  // Secondary index on drugs.name for search
  await client.execute(`
    CREATE INDEX IF NOT EXISTS idx_drugs_name
    ON drugs (name)
  `);

  await client.shutdown();

  console.log('[schema] Keyspace and tables initialized');
}
