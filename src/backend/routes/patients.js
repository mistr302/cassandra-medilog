import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import client from '../db/client.js';
import { logAudit } from '../db/audit.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

// GET /api/patients?lastName=&nationalId=
router.get('/', async (req, res, next) => {
  try {
    const { lastName, nationalId } = req.query;

    let query;
    let params;

    if (nationalId) {
      query = 'SELECT * FROM patients WHERE national_id = ?';
      params = [nationalId];
    } else if (lastName) {
      query = 'SELECT * FROM patients WHERE last_name = ?';
      params = [lastName];
    } else {
      // Full table scan — acceptable for small clinics; add LIMIT for safety
      query = 'SELECT * FROM patients LIMIT 200';
      params = [];
    }

    const result = await client.execute(query, params);
    const patients = result.rows.map(formatPatient);
    res.json(patients);
  } catch (err) {
    next(err);
  }
});

// GET /api/patients/:id
router.get('/:id', async (req, res, next) => {
  try {
    const result = await client.execute('SELECT * FROM patients WHERE patient_id = ?', [req.params.id]);
    if (result.rowLength === 0) return res.status(404).json({ error: 'Patient not found' });
    res.json(formatPatient(result.first()));
  } catch (err) {
    next(err);
  }
});

// POST /api/patients
router.post('/', authorize('doctor', 'admin'), async (req, res, next) => {
  try {
    const { first_name, last_name, birth_date, national_id, blood_type, allergies, phone, email } = req.body;

    if (!first_name || !last_name) {
      return res.status(400).json({ error: 'first_name and last_name are required' });
    }

    const patientId = uuidv4();

    await client.execute(
      `INSERT INTO patients
        (patient_id, first_name, last_name, birth_date, national_id, blood_type, allergies, phone, email, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, toTimestamp(now()))`,
      [
        patientId,
        first_name,
        last_name,
        birth_date || null,
        national_id || null,
        blood_type || null,
        allergies && allergies.length ? allergies : null,
        phone || null,
        email || null,
      ],
    );

    await logAudit({
      patientId,
      actorId: req.user.doctor_id,
      actorName: `${req.user.first_name} ${req.user.last_name}`,
      action: 'CREATE',
      entityType: 'patient',
      entityId: patientId,
      changes: { first_name, last_name },
      ip: req.ip,
    });

    res.status(201).json({ patient_id: patientId, first_name, last_name });
  } catch (err) {
    next(err);
  }
});

// PUT /api/patients/:id
router.put('/:id', authorize('doctor', 'admin'), async (req, res, next) => {
  try {
    const patientId = req.params.id;
    const { first_name, last_name, birth_date, national_id, blood_type, allergies, phone, email } = req.body;

    // Verify patient exists
    const existing = await client.execute('SELECT patient_id FROM patients WHERE patient_id = ?', [patientId]);
    if (existing.rowLength === 0) return res.status(404).json({ error: 'Patient not found' });

    await client.execute(
      `UPDATE patients SET
        first_name = ?, last_name = ?, birth_date = ?, national_id = ?,
        blood_type = ?, allergies = ?, phone = ?, email = ?
       WHERE patient_id = ?`,
      [
        first_name, last_name, birth_date || null, national_id || null,
        blood_type || null, allergies && allergies.length ? allergies : null,
        phone || null, email || null, patientId,
      ],
    );

    await logAudit({
      patientId,
      actorId: req.user.doctor_id,
      actorName: `${req.user.first_name} ${req.user.last_name}`,
      action: 'UPDATE',
      entityType: 'patient',
      entityId: patientId,
      changes: req.body,
      ip: req.ip,
    });

    res.json({ message: 'Patient updated' });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/patients/:id
router.delete('/:id', authorize('admin'), async (req, res, next) => {
  try {
    const patientId = req.params.id;
    await client.execute('DELETE FROM patients WHERE patient_id = ?', [patientId]);

    await logAudit({
      patientId,
      actorId: req.user.doctor_id,
      actorName: `${req.user.first_name} ${req.user.last_name}`,
      action: 'DELETE',
      entityType: 'patient',
      entityId: patientId,
      changes: null,
      ip: req.ip,
    });

    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

function formatPatient(row) {
  return {
    patient_id: row.patient_id?.toString(),
    first_name: row.first_name,
    last_name: row.last_name,
    birth_date: row.birth_date?.toLocalDate?.()?.toString() ?? row.birth_date,
    national_id: row.national_id,
    blood_type: row.blood_type,
    allergies: row.allergies ? [...row.allergies] : [],
    phone: row.phone,
    email: row.email,
    created_at: row.created_at,
  };
}

export default router;
