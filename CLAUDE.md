# MediLog – Medical Records and Medications

## Project Overview

MediLog is a full-stack application for managing patients, medical history, medications, dosages, and treatment plans. The system is designed for use in a clinic or small polyclinic. Apache Cassandra provides an audit trail and fast queries by patient.

## Tech Stack

- **Backend:** Node.js REST API with JWT authentication and RBAC
- **Frontend:** Web UI (React or similar)
- **Database:** Apache Cassandra

## Required Queries

| ID | Description |
|----|-------------|
| Q1 | Get all examinations of patient P |
| Q2 | Get active prescriptions of patient P |
| Q3 | Get dosage history of drug L for patient P over the last 30 days |
| Q4 | Find all patients allergic to substance X |
| Q5 | Get audit log of changes for patient P |
| Q6 | Get appointments for doctor D on a specific day |
| Q7 | Check interaction between drugs L1 and L2 |
| Q8 | Get prescription statistics for the last month |

## Cassandra Tables

### doctors
Stores doctor accounts for authentication and links to appointments. Primary key: `(doctor_id)`.

| Column | Type |
|--------|------|
| doctor_id | UUID |
| email | TEXT |
| password_hash | TEXT |
| first_name | TEXT |
| last_name | TEXT |
| role | TEXT |
| specialization | TEXT |
| created_at | TIMESTAMP |

### patients
Primary key: `(patient_id)`

| Column | Type |
|--------|------|
| patient_id | UUID |
| first_name | TEXT |
| last_name | TEXT |
| birth_date | DATE |
| national_id | TEXT |
| blood_type | TEXT |
| allergies | SET\<TEXT\> |
| phone | TEXT |
| email | TEXT |
| created_at | TIMESTAMP |

### examinations_by_patient
Primary key: `(patient_id, examined_at, exam_id)` — partitioned by patient, clustered by time descending.

| Column | Type |
|--------|------|
| patient_id | UUID |
| examined_at | TIMESTAMP |
| exam_id | TIMEUUID |
| doctor_id | UUID |
| doctor_name | TEXT |
| diagnosis | TEXT |
| notes | TEXT |
| icd10_code | TEXT |
| follow_up | DATE |

### prescriptions_by_patient
Primary key: `(patient_id, drug_id)` — partitioned by patient.

| Column | Type |
|--------|------|
| patient_id | UUID |
| drug_id | UUID |
| drug_name | TEXT |
| dosage | TEXT |
| start_date | DATE |
| end_date | DATE |
| prescribed_by | UUID |
| active | BOOLEAN |

### medication_log
Primary key: `(patient_id, drug_id, taken_at)` — partitioned by patient+drug, clustered by time. **TTL: 90 days.** Handled by created_at, does not delete the record.

| Column | Type |
|--------|------|
| patient_id | UUID |
| drug_id | UUID |
| taken_at | TIMESTAMP |
| dose_taken | TEXT |
| administered_by | UUID |
| notes | TEXT |

### patient_audit_log
Append-only audit log. Primary key: `(patient_id, event_at, event_id)`.

| Column | Type |
|--------|------|
| patient_id | UUID |
| event_at | TIMESTAMP |
| event_id | TIMEUUID |
| actor_id | UUID |
| actor_name | TEXT |
| action | TEXT |
| entity_type | TEXT |
| entity_id | UUID |
| changes | TEXT |
| ip_address | TEXT |

### appointments_by_doctor_day
Primary key: `(doctor_id, appt_date, start_time, appt_id)` — partitioned by doctor+date.

| Column | Type |
|--------|------|
| doctor_id | UUID |
| appt_date | DATE |
| start_time | TIME |
| appt_id | UUID |
| patient_id | UUID |
| patient_name | TEXT |
| reason | TEXT |
| status | TEXT |

### drug_interactions
Symmetric relation — store both directions (drug_id_a, drug_id_b) and (drug_id_b, drug_id_a). Primary key: `(drug_id_a, drug_id_b)`.

| Column | Type |
|--------|------|
| drug_id_a | UUID |
| drug_id_b | UUID |
| severity | TEXT |
| description | TEXT |

### prescription_stats
Uses a COUNTER column. Primary key: `(month, drug_id)`.

| Column | Type |
|--------|------|
| month | TEXT |
| drug_id | UUID |
| drug_name | TEXT (STATIC) |
| count | COUNTER |

## Advanced Cassandra Concepts Used

- **Secondary Index** — on `patients.allergies` (SET collection) for Q4
- **TIMEUUID** — for event/exam IDs to guarantee uniqueness with embedded timestamps
- **Append-only audit log** — `patient_audit_log` is insert-only, never updated or deleted
- **SET collection** — `patients.allergies` stores multiple allergy values
- **STATIC column** — `prescription_stats.drug_name` is shared across all rows in a partition
- **Symmetric relations** — `drug_interactions` stores both (A,B) and (B,A) for bidirectional lookup
- **JWT and RBAC** — authentication via JWT tokens, role-based access control (doctor, nurse, admin)

## REST API Endpoints

### Authentication
- `POST /api/auth/login` — login with email and password, returns JWT
- `POST /api/auth/register` — register a new doctor account

### Patients
- `GET /api/patients?lastName=&nationalId=` — search patients
- `GET /api/patients/:id` — get patient detail
- `POST /api/patients` — register new patient
- `PUT /api/patients/:id` — update patient
- `DELETE /api/patients/:id` — delete patient

### Examinations
- `GET /api/patients/:id/examinations` — list examinations (Q1)
- `POST /api/patients/:id/examinations` — create examination

### Prescriptions
- `GET /api/patients/:id/prescriptions` — list prescriptions (Q2: filter active)
- `POST /api/patients/:id/prescriptions` — create prescription

### Medication Log
- `POST /api/patients/:id/medications/log` — log a dose
- `GET /api/patients/:id/medications/:drugId/log?days=30` — dosage history (Q3)

### Drug Interactions
- `GET /api/drugs/:id1/interactions/:id2` — check interaction between two drugs (Q7)
- `GET /api/patients/:id/interaction-check` — check all interactions for a patient's active prescriptions

### Appointments
- `GET /api/doctors/:id/appointments?date=YYYY-MM-DD` — doctor's schedule for a day (Q6)
- `POST /api/appointments` — create appointment
- `PUT /api/appointments/:id` — update appointment

### Audit
- `GET /api/patients/:id/audit?from=&to=&action=` — audit log (Q5)

### Analytics
- `GET /api/analytics/prescriptions?month=` — prescription statistics (Q8)
- `GET /api/analytics/diagnoses?month=` — diagnosis statistics

## Frontend Pages

1. **Login** — authentication form
2. **Doctor Dashboard** — overview of today's appointments, recent patients
3. **Patient Detail** — demographics, allergies, examinations, prescriptions, medication log, audit log
4. **Appointment Management** — schedule and manage appointments
5. **Analytics** — prescription and diagnosis statistics with charts

## Test Scenarios

1. **Login** as doctor and nurse (different roles, different permissions)
2. **Register patients** with demographics and allergies
3. **Create examinations and prescriptions** — verify they appear in patient detail
4. **Log medication doses** — verify dosage history with time filtering
5. **Check drug interactions** — verify warnings when prescribing interacting drugs
6. **Audit log** — verify all changes to patient records are logged
7. **Prescription statistics** — verify monthly aggregation via counters
