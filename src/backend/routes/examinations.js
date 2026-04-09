import { Router } from 'express';
import client from '../db/client.js';
import { logAudit } from '../db/audit.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router({ mergeParams: true });

router.use(authenticate);

// GET /api/patients/:id/examinations  — Q1
router.get('/', async (req, res, next) => {
  try {
    const result = await client.execute(
      'SELECT * FROM examinations_by_patient WHERE patient_id = ?',
      [req.params.id],
    );
    res.json(result.rows.map(formatExam));
  } catch (err) {
    next(err);
  }
});

// POST /api/patients/:id/examinations
router.post('/', authorize('doctor', 'admin'), async (req, res, next) => {
  try {
    const patientId = req.params.id;
    const { diagnosis, notes, icd10_code, follow_up } = req.body;

    if (!diagnosis) {
      return res.status(400).json({ error: 'diagnosis is required' });
    }

    const doctorName = `${req.user.first_name} ${req.user.last_name}`;

    await client.execute(
      `INSERT INTO examinations_by_patient
        (patient_id, examined_at, exam_id, doctor_id, doctor_name, diagnosis, notes, icd10_code, follow_up)
       VALUES (?, toTimestamp(now()), now(), ?, ?, ?, ?, ?, ?)`,
      [
        patientId,
        req.user.doctor_id,
        doctorName,
        diagnosis,
        notes || null,
        icd10_code || null,
        follow_up || null,
      ],
    );

    await logAudit({
      patientId,
      actorId: req.user.doctor_id,
      actorName: doctorName,
      action: 'CREATE',
      entityType: 'examination',
      entityId: null,
      changes: { diagnosis, icd10_code },
      ip: req.ip,
    });

    res.status(201).json({ message: 'Examination created' });
  } catch (err) {
    next(err);
  }
});

function formatExam(row) {
  return {
    patient_id: row.patient_id?.toString(),
    examined_at: row.examined_at,
    exam_id: row.exam_id?.toString(),
    doctor_id: row.doctor_id?.toString(),
    doctor_name: row.doctor_name,
    diagnosis: row.diagnosis,
    notes: row.notes,
    icd10_code: row.icd10_code,
    follow_up: row.follow_up?.toLocalDate?.()?.toString() ?? row.follow_up,
  };
}

export default router;
