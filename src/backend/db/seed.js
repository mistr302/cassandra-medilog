import cassandra from 'cassandra-driver';
import bcrypt from 'bcrypt';
import config from '../config.js';

const { types } = cassandra;
const TimeUuid = types.TimeUuid;
const Uuid = types.Uuid;

/**
 * Seeds the database with example records for testing.
 * Only runs when SEED_DB=true in .env.
 */
export async function seedDatabase(client) {
  if (process.env.SEED_DB !== 'true') return;

  // Check if test data already exists (idempotent)
  const existing = await client.execute(
    'SELECT doctor_id FROM doctors WHERE email = ?',
    ['test@test.com']
  );
  if (existing.rowLength > 0) {
    console.log('[seed] Test data already exists, skipping seed');
    return;
  }

  console.log('[seed] Populating database with example records...');

  // ── Fixed UUIDs for reproducible test data ───────────────────
  const doctorIds = {
    test:     Uuid.fromString('00000000-0000-0000-0000-000000000000'),
    smith:    Uuid.fromString('11111111-1111-1111-1111-111111111111'),
    johnson:  Uuid.fromString('22222222-2222-2222-2222-222222222222'),
    nurse:    Uuid.fromString('33333333-3333-3333-3333-333333333333'),
    admin:    Uuid.fromString('44444444-4444-4444-4444-444444444444'),
  };

  const patientIds = {
    doe:      Uuid.fromString('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
    garcia:   Uuid.fromString('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
    mueller:  Uuid.fromString('cccccccc-cccc-cccc-cccc-cccccccccccc'),
    novak:    Uuid.fromString('dddddddd-dddd-dddd-dddd-dddddddddddd'),
    kim:      Uuid.fromString('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'),
  };

  const drugIds = {
    ibuprofen:    Uuid.fromString('d1111111-d111-d111-d111-d11111111111'),
    amoxicillin:  Uuid.fromString('d2222222-d222-d222-d222-d22222222222'),
    metformin:    Uuid.fromString('d3333333-d333-d333-d333-d33333333333'),
    lisinopril:   Uuid.fromString('d4444444-d444-d444-d444-d44444444444'),
    warfarin:     Uuid.fromString('d5555555-d555-d555-d555-d55555555555'),
    aspirin:      Uuid.fromString('d6666666-d666-d666-d666-d66666666666'),
    omeprazole:   Uuid.fromString('d7777777-d777-d777-d777-d77777777777'),
  };

  // Password "test123" for all test accounts
  const passwordHash = await bcrypt.hash('test123', 10);

  // ── Doctors ──────────────────────────────────────────────────
  const doctors = [
    [doctorIds.test, 'test@test.com', passwordHash, 'Test', 'User', 'doctor', 'General Practice'],
    [doctorIds.smith, 'smith@medilog.test', passwordHash, 'John', 'Smith', 'doctor', 'Cardiology'],
    [doctorIds.johnson, 'johnson@medilog.test', passwordHash, 'Sarah', 'Johnson', 'doctor', 'General Practice'],
    [doctorIds.nurse, 'nurse@medilog.test', passwordHash, 'Emily', 'Brown', 'nurse', null],
    [doctorIds.admin, 'admin@medilog.test', passwordHash, 'Michael', 'Davis', 'admin', null],
  ];

  for (const d of doctors) {
    await client.execute(
      `INSERT INTO doctors (doctor_id, email, password_hash, first_name, last_name, role, specialization, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, toTimestamp(now()))`,
      d,
    );
  }

  // ── Patients ─────────────────────────────────────────────────
  const patients = [
    [patientIds.doe,     'Jane',   'Doe',     '1985-03-15', 'NID-001', 'A+',  ['Penicillin', 'Sulfa'],        '+420111222333', 'jane.doe@email.test'],
    [patientIds.garcia,  'Carlos', 'Garcia',  '1972-07-22', 'NID-002', 'O-',  ['Aspirin'],                     '+420444555666', 'carlos.garcia@email.test'],
    [patientIds.mueller, 'Anna',   'Mueller', '1990-11-03', 'NID-003', 'B+',  [],                              '+420777888999', 'anna.mueller@email.test'],
    [patientIds.novak,   'Peter',  'Novak',   '1965-01-30', 'NID-004', 'AB+', ['Ibuprofen', 'Latex'],          '+420123456789', 'peter.novak@email.test'],
    [patientIds.kim,     'Sun',    'Kim',     '2000-06-18', 'NID-005', 'O+',  [],                              '+420987654321', 'sun.kim@email.test'],
  ];

  for (const p of patients) {
    await client.execute(
      `INSERT INTO patients (patient_id, first_name, last_name, birth_date, national_id, blood_type, allergies, phone, email, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, toTimestamp(now()))`,
      [p[0], p[1], p[2], types.LocalDate.fromString(p[3]), p[4], p[5], p[6], p[7], p[8]],
    );
  }

  // ── Drugs Catalog ──────────────────────────────────────────────
  const drugs = [
    [drugIds.ibuprofen, 'Ibuprofen', 'Ibuprofen', 'NSAID', 'Nonsteroidal anti-inflammatory drug for pain and inflammation'],
    [drugIds.amoxicillin, 'Amoxicillin', 'Amoxicillin', 'Antibiotic', 'Penicillin-type antibiotic for bacterial infections'],
    [drugIds.metformin, 'Metformin', 'Metformin hydrochloride', 'Antidiabetic', 'First-line medication for type 2 diabetes'],
    [drugIds.lisinopril, 'Lisinopril', 'Lisinopril', 'ACE Inhibitor', 'Treats high blood pressure and heart failure'],
    [drugIds.warfarin, 'Warfarin', 'Warfarin sodium', 'Anticoagulant', 'Blood thinner to prevent blood clots'],
    [drugIds.aspirin, 'Aspirin', 'Acetylsalicylic acid', 'NSAID', 'Pain reliever and blood thinner'],
    [drugIds.omeprazole, 'Omeprazole', 'Omeprazole', 'Proton Pump Inhibitor', 'Reduces stomach acid production'],
    [Uuid.fromString('d8888888-d888-d888-d888-d88888888888'), 'Atorvastatin', 'Atorvastatin calcium', 'Statin', 'Lowers cholesterol and triglycerides'],
    [Uuid.fromString('d9999999-d999-d999-d999-d99999999999'), 'Amlodipine', 'Amlodipine besylate', 'Calcium Channel Blocker', 'Treats high blood pressure and chest pain'],
    [Uuid.fromString('da000000-da00-da00-da00-da0000000000'), 'Levothyroxine', 'Levothyroxine sodium', 'Thyroid Hormone', 'Treats hypothyroidism'],
  ];

  for (const d of drugs) {
    await client.execute(
      `INSERT INTO drugs (drug_id, name, generic_name, category, description, created_at)
       VALUES (?, ?, ?, ?, ?, toTimestamp(now()))`,
      d,
    );
  }

  // ── Examinations ─────────────────────────────────────────────
  const now = Date.now();
  const DAY = 86_400_000;

  const examinations = [
    [patientIds.doe, new Date(now - 30 * DAY), doctorIds.smith, 'Dr. John Smith', 'Essential hypertension', 'BP 150/95. Started on ACE inhibitor.', 'I10', types.LocalDate.fromString('2026-04-20')],
    [patientIds.doe, new Date(now - 10 * DAY), doctorIds.johnson, 'Dr. Sarah Johnson', 'Acute bronchitis', 'Cough for 5 days, mild fever. Prescribed rest and fluids.', 'J20.9', types.LocalDate.fromString('2026-04-15')],
    [patientIds.garcia, new Date(now - 20 * DAY), doctorIds.smith, 'Dr. John Smith', 'Type 2 diabetes mellitus', 'HbA1c 7.2%. Adjusting metformin dosage.', 'E11', types.LocalDate.fromString('2026-05-01')],
    [patientIds.mueller, new Date(now - 5 * DAY), doctorIds.johnson, 'Dr. Sarah Johnson', 'Annual checkup', 'All vitals normal. No concerns.', 'Z00.0', null],
    [patientIds.novak, new Date(now - 15 * DAY), doctorIds.smith, 'Dr. John Smith', 'Atrial fibrillation', 'Irregular heartbeat detected. Starting anticoagulation therapy.', 'I48.0', types.LocalDate.fromString('2026-04-25')],
  ];

  for (const e of examinations) {
    await client.execute(
      `INSERT INTO examinations_by_patient (patient_id, examined_at, exam_id, doctor_id, doctor_name, diagnosis, notes, icd10_code, follow_up)
       VALUES (?, ?, now(), ?, ?, ?, ?, ?, ?)`,
      e,
    );
  }

  // ── Prescriptions ────────────────────────────────────────────
  const today = types.LocalDate.fromDate(new Date());
  const future30 = types.LocalDate.fromString('2026-05-09');
  const future90 = types.LocalDate.fromString('2026-07-09');
  const past30 = types.LocalDate.fromString('2026-03-10');

  const prescriptions = [
    [patientIds.doe,    drugIds.lisinopril,  'Lisinopril',   '10mg once daily',       today, future90, doctorIds.smith, true],
    [patientIds.doe,    drugIds.omeprazole,  'Omeprazole',   '20mg before breakfast',  today, future30, doctorIds.johnson, true],
    [patientIds.garcia, drugIds.metformin,   'Metformin',    '500mg twice daily',      past30, future90, doctorIds.smith, true],
    [patientIds.garcia, drugIds.ibuprofen,   'Ibuprofen',    '400mg as needed',        past30, today, doctorIds.johnson, false],
    [patientIds.novak,  drugIds.warfarin,    'Warfarin',     '5mg once daily',         today, future90, doctorIds.smith, true],
    [patientIds.kim,    drugIds.amoxicillin, 'Amoxicillin',  '500mg three times daily', today, future30, doctorIds.johnson, true],
  ];

  for (const p of prescriptions) {
    await client.execute(
      `INSERT INTO prescriptions_by_patient (patient_id, drug_id, drug_name, dosage, start_date, end_date, prescribed_by, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      p,
    );
  }

  // ── Medication Log ───────────────────────────────────────────
  const medLogs = [
    [patientIds.doe, drugIds.lisinopril, new Date(now - 1 * DAY), '10mg', doctorIds.nurse, 'Morning dose'],
    [patientIds.doe, drugIds.lisinopril, new Date(now - 2 * DAY), '10mg', doctorIds.nurse, 'Morning dose'],
    [patientIds.doe, drugIds.lisinopril, new Date(now - 3 * DAY), '10mg', doctorIds.nurse, null],
    [patientIds.doe, drugIds.omeprazole, new Date(now - 1 * DAY), '20mg', doctorIds.nurse, 'Before breakfast'],
    [patientIds.garcia, drugIds.metformin, new Date(now - 1 * DAY), '500mg', doctorIds.nurse, 'Morning dose'],
    [patientIds.garcia, drugIds.metformin, new Date(now - 1 * DAY + 12 * 3_600_000), '500mg', doctorIds.nurse, 'Evening dose'],
    [patientIds.garcia, drugIds.metformin, new Date(now - 2 * DAY), '500mg', doctorIds.nurse, null],
    [patientIds.novak, drugIds.warfarin, new Date(now - 1 * DAY), '5mg', doctorIds.nurse, 'INR check scheduled'],
  ];

  for (const m of medLogs) {
    await client.execute(
      `INSERT INTO medication_log (patient_id, drug_id, taken_at, dose_taken, administered_by, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      m,
    );
  }

  // ── Drug Interactions ────────────────────────────────────────
  const interactions = [
    [drugIds.warfarin, drugIds.aspirin, 'high', 'Increased risk of bleeding. Concurrent use should be avoided unless specifically indicated.'],
    [drugIds.warfarin, drugIds.ibuprofen, 'high', 'NSAIDs increase anticoagulant effect and bleeding risk.'],
    [drugIds.lisinopril, drugIds.ibuprofen, 'moderate', 'NSAIDs may reduce the antihypertensive effect of ACE inhibitors and increase risk of renal impairment.'],
    [drugIds.metformin, drugIds.lisinopril, 'low', 'ACE inhibitors may enhance the hypoglycemic effect of metformin. Monitor blood glucose.'],
  ];

  for (const [a, b, severity, description] of interactions) {
    // Store both directions for symmetric lookup
    await client.execute(
      'INSERT INTO drug_interactions (drug_id_a, drug_id_b, severity, description) VALUES (?, ?, ?, ?)',
      [a, b, severity, description],
    );
    await client.execute(
      'INSERT INTO drug_interactions (drug_id_a, drug_id_b, severity, description) VALUES (?, ?, ?, ?)',
      [b, a, severity, description],
    );
  }

  // ── Appointments ─────────────────────────────────────────────
  const todayDate = types.LocalDate.fromDate(new Date());
  const tomorrowDate = types.LocalDate.fromString('2026-04-11');
  const dayAfterTomorrow = types.LocalDate.fromString('2026-04-12');
  const nextWeek = types.LocalDate.fromString('2026-04-17');

  const appointments = [
    // Today - Dr. Smith
    [doctorIds.smith, todayDate, types.LocalTime.fromString('09:00:00'), Uuid.random(), patientIds.doe, 'Jane Doe', 'Follow-up: hypertension', 'scheduled'],
    [doctorIds.smith, todayDate, types.LocalTime.fromString('10:30:00'), Uuid.random(), patientIds.novak, 'Peter Novak', 'INR check and warfarin review', 'scheduled'],
    [doctorIds.smith, todayDate, types.LocalTime.fromString('14:00:00'), Uuid.random(), patientIds.garcia, 'Carlos Garcia', 'Diabetes management review', 'scheduled'],
    [doctorIds.smith, todayDate, types.LocalTime.fromString('15:30:00'), Uuid.random(), patientIds.kim, 'Sun Kim', 'New patient consultation', 'scheduled'],
    // Today - Dr. Johnson
    [doctorIds.johnson, todayDate, types.LocalTime.fromString('08:30:00'), Uuid.random(), patientIds.mueller, 'Anna Mueller', 'Lab results review', 'completed'],
    [doctorIds.johnson, todayDate, types.LocalTime.fromString('11:00:00'), Uuid.random(), patientIds.kim, 'Sun Kim', 'Follow-up: antibiotics', 'scheduled'],
    [doctorIds.johnson, todayDate, types.LocalTime.fromString('13:00:00'), Uuid.random(), patientIds.doe, 'Jane Doe', 'Respiratory follow-up', 'scheduled'],
    [doctorIds.johnson, todayDate, types.LocalTime.fromString('16:00:00'), Uuid.random(), patientIds.novak, 'Peter Novak', 'Blood pressure check', 'cancelled'],
    // Tomorrow
    [doctorIds.smith, tomorrowDate, types.LocalTime.fromString('09:00:00'), Uuid.random(), patientIds.garcia, 'Carlos Garcia', 'HbA1c recheck', 'scheduled'],
    [doctorIds.smith, tomorrowDate, types.LocalTime.fromString('10:00:00'), Uuid.random(), patientIds.mueller, 'Anna Mueller', 'Annual physical', 'scheduled'],
    [doctorIds.smith, tomorrowDate, types.LocalTime.fromString('11:30:00'), Uuid.random(), patientIds.doe, 'Jane Doe', 'Medication adjustment', 'scheduled'],
    [doctorIds.johnson, tomorrowDate, types.LocalTime.fromString('09:30:00'), Uuid.random(), patientIds.novak, 'Peter Novak', 'Cardiac consultation', 'scheduled'],
    [doctorIds.johnson, tomorrowDate, types.LocalTime.fromString('14:00:00'), Uuid.random(), patientIds.kim, 'Sun Kim', 'Prescription renewal', 'scheduled'],
    // Day after tomorrow
    [doctorIds.smith, dayAfterTomorrow, types.LocalTime.fromString('08:00:00'), Uuid.random(), patientIds.kim, 'Sun Kim', 'Follow-up visit', 'scheduled'],
    [doctorIds.johnson, dayAfterTomorrow, types.LocalTime.fromString('10:00:00'), Uuid.random(), patientIds.garcia, 'Carlos Garcia', 'Diabetes education', 'scheduled'],
    [doctorIds.johnson, dayAfterTomorrow, types.LocalTime.fromString('15:00:00'), Uuid.random(), patientIds.mueller, 'Anna Mueller', 'Vaccination', 'scheduled'],
    // Next week
    [doctorIds.smith, nextWeek, types.LocalTime.fromString('09:00:00'), Uuid.random(), patientIds.doe, 'Jane Doe', 'Monthly check-up', 'scheduled'],
    [doctorIds.smith, nextWeek, types.LocalTime.fromString('11:00:00'), Uuid.random(), patientIds.novak, 'Peter Novak', 'Warfarin dose review', 'scheduled'],
    [doctorIds.johnson, nextWeek, types.LocalTime.fromString('10:00:00'), Uuid.random(), patientIds.garcia, 'Carlos Garcia', 'Lab work review', 'scheduled'],
  ];

  for (const a of appointments) {
    await client.execute(
      `INSERT INTO appointments_by_doctor_day (doctor_id, appt_date, start_time, appt_id, patient_id, patient_name, reason, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      a,
    );
  }

  // ── Prescription Stats (counter table) ───────────────────────
  const month = '2026-04';
  const statEntries = [
    [month, drugIds.lisinopril,  3],
    [month, drugIds.metformin,   5],
    [month, drugIds.amoxicillin, 2],
    [month, drugIds.warfarin,    4],
    [month, drugIds.omeprazole,  6],
    [month, drugIds.ibuprofen,   8],
  ];

  for (const [m, drugId, count] of statEntries) {
    await client.execute(
      'UPDATE prescription_stats SET count = count + ? WHERE month = ? AND drug_id = ?',
      [types.Long.fromInt(count), m, drugId],
    );
  }

  // ── Audit Log ────────────────────────────────────────────────
  const auditEntries = [
    [patientIds.doe, doctorIds.smith, 'Dr. John Smith', 'CREATE', 'patient', patientIds.doe, '{"action":"Patient registered"}', '192.168.1.10'],
    [patientIds.doe, doctorIds.smith, 'Dr. John Smith', 'CREATE', 'examination', patientIds.doe, '{"diagnosis":"Essential hypertension"}', '192.168.1.10'],
    [patientIds.doe, doctorIds.smith, 'Dr. John Smith', 'CREATE', 'prescription', drugIds.lisinopril, '{"drug":"Lisinopril","dosage":"10mg once daily"}', '192.168.1.10'],
    [patientIds.doe, doctorIds.johnson, 'Dr. Sarah Johnson', 'CREATE', 'examination', patientIds.doe, '{"diagnosis":"Acute bronchitis"}', '192.168.1.15'],
    [patientIds.garcia, doctorIds.smith, 'Dr. John Smith', 'CREATE', 'patient', patientIds.garcia, '{"action":"Patient registered"}', '192.168.1.10'],
    [patientIds.garcia, doctorIds.smith, 'Dr. John Smith', 'UPDATE', 'prescription', drugIds.metformin, '{"dosage":"500mg -> 500mg twice daily"}', '192.168.1.10'],
  ];

  for (const a of auditEntries) {
    await client.execute(
      `INSERT INTO patient_audit_log (patient_id, event_at, event_id, actor_id, actor_name, action, entity_type, entity_id, changes, ip_address)
       VALUES (?, toTimestamp(now()), now(), ?, ?, ?, ?, ?, ?, ?)`,
      a,
    );
  }

  console.log('[seed] Database seeded successfully');
  console.log('[seed] ');
  console.log('[seed] ═══════════════════════════════════════════════════════');
  console.log('[seed]  TEST ACCOUNTS (password for all: test123)');
  console.log('[seed] ═══════════════════════════════════════════════════════');
  console.log('[seed]  ★ Quick Test:  test@test.com');
  console.log('[seed]  ─────────────────────────────────────────────────────');
  console.log('[seed]  Doctors:       smith@medilog.test');
  console.log('[seed]                 johnson@medilog.test');
  console.log('[seed]  Nurse:         nurse@medilog.test');
  console.log('[seed]  Admin:         admin@medilog.test');
  console.log('[seed] ═══════════════════════════════════════════════════════');
}
