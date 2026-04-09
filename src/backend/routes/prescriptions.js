import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import client from '../db/client.js';
import { logAudit } from '../db/audit.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router({ mergeParams: true });

router.use(authenticate);

// GET /api/patients/:id/prescriptions  — Q2 (filter ?active=true)
router.get('/', async (req, res, next) => {
  try {
    const result = await client.execute(
      'SELECT * FROM prescriptions_by_patient WHERE patient_id = ?',
      [req.params.id],
    );

    let rows = result.rows;
    if (req.query.active === 'true') {
      rows = rows.filter((r) => r.active === true);
    }

    res.json(rows.map(formatPrescription));
  } catch (err) {
    next(err);
  }
});

// POST /api/patients/:id/prescriptions
router.post('/', authorize('doctor', 'admin'), async (req, res, next) => {
  try {
    const patientId = req.params.id;
    const { drug_name, dosage, start_date, end_date, active } = req.body;

    if (!drug_name || !dosage) {
      return res.status(400).json({ error: 'drug_name and dosage are required' });
    }

    const drugId = uuidv4();

    await client.execute(
      `INSERT INTO prescriptions_by_patient
        (patient_id, drug_id, drug_name, dosage, start_date, end_date, prescribed_by, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        patientId,
        drugId,
        drug_name,
        dosage,
        start_date || null,
        end_date || null,
        req.user.doctor_id,
        active !== undefined ? active : true,
      ],
    );

    // Increment prescription_stats counter
    const month = (start_date || new Date().toISOString().slice(0, 7)).slice(0, 7);
    await client.execute(
      'UPDATE prescription_stats SET count = count + 1 WHERE month = ? AND drug_id = ?',
      [month, drugId],
    );

    await logAudit({
      patientId,
      actorId: req.user.doctor_id,
      actorName: `${req.user.first_name} ${req.user.last_name}`,
      action: 'CREATE',
      entityType: 'prescription',
      entityId: drugId,
      changes: { drug_name, dosage },
      ip: req.ip,
    });

    res.status(201).json({ drug_id: drugId, drug_name, dosage });
  } catch (err) {
    next(err);
  }
});

function formatPrescription(row) {
  return {
    patient_id: row.patient_id?.toString(),
    drug_id: row.drug_id?.toString(),
    drug_name: row.drug_name,
    dosage: row.dosage,
    start_date: row.start_date?.toLocalDate?.()?.toString() ?? row.start_date,
    end_date: row.end_date?.toLocalDate?.()?.toString() ?? row.end_date,
    prescribed_by: row.prescribed_by?.toString(),
    active: row.active,
  };
}

export default router;
