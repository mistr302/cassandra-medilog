/**
 * Centralized API route definitions.
 * Import this file everywhere instead of hardcoding URLs.
 */

const BASE = '/api';

const API = {
  // ── Authentication ──────────────────────────────────────────────
  auth: {
    login:    `${BASE}/auth/login`,
    register: `${BASE}/auth/register`,
  },

  // ── Patients ────────────────────────────────────────────────────
  patients: {
    list:   `${BASE}/patients`,                       // GET ?lastName=&nationalId=
    detail: (id) => `${BASE}/patients/${id}`,         // GET / PUT / DELETE
    create: `${BASE}/patients`,                       // POST
  },

  // ── Examinations ────────────────────────────────────────────────
  examinations: {
    list:   (patientId) => `${BASE}/patients/${patientId}/examinations`,  // GET (Q1)
    create: (patientId) => `${BASE}/patients/${patientId}/examinations`,  // POST
  },

  // ── Prescriptions ──────────────────────────────────────────────
  prescriptions: {
    list:   (patientId) => `${BASE}/patients/${patientId}/prescriptions`, // GET (Q2)
    create: (patientId) => `${BASE}/patients/${patientId}/prescriptions`, // POST
  },

  // ── Medication Log ─────────────────────────────────────────────
  medications: {
    log:     (patientId) => `${BASE}/patients/${patientId}/medications/log`,                      // POST
    history: (patientId, drugId) => `${BASE}/patients/${patientId}/medications/${drugId}/log`,     // GET ?days=30 (Q3)
  },

  // ── Drug Interactions ──────────────────────────────────────────
  drugs: {
    interaction:      (id1, id2) => `${BASE}/drugs/${id1}/interactions/${id2}`,                    // GET (Q7)
    patientCheck:     (patientId) => `${BASE}/patients/${patientId}/interaction-check`,            // GET
  },

  // ── Appointments ───────────────────────────────────────────────
  appointments: {
    byDoctor: (doctorId) => `${BASE}/doctors/${doctorId}/appointments`,   // GET ?date=YYYY-MM-DD (Q6)
    create:   `${BASE}/appointments`,                                     // POST
    update:   (id) => `${BASE}/appointments/${id}`,                       // PUT
  },

  // ── Audit ──────────────────────────────────────────────────────
  audit: {
    list: (patientId) => `${BASE}/patients/${patientId}/audit`,           // GET ?from=&to=&action= (Q5)
  },

  // ── Analytics ──────────────────────────────────────────────────
  analytics: {
    prescriptions: `${BASE}/analytics/prescriptions`,  // GET ?month= (Q8)
    diagnoses:     `${BASE}/analytics/diagnoses`,      // GET ?month=
  },
};

export default API;
