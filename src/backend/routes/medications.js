import { Router } from 'express';
import client from '../db/client.js';
import { logAudit } from '../db/audit.js';
import { authenticate } from '../middleware/auth.js';

const router = Router({ mergeParams: true });

router.use(authenticate);

// POST /api/patients/:id/medications/log
router.post('/log', async (req, res, next) => {
  try {
    const patientId = req.params.id;
    const { drug_id, dose_taken, notes } = req.body;

    if (!drug_id || !dose_taken) {
      return res.status(400).json({ error: 'drug_id and dose_taken are required' });
    }

    // Insert with TTL 90 days (7_776_000 seconds)
    await client.execute(
      `INSERT INTO medication_log
        (patient_id, drug_id, taken_at, dose_taken, administered_by, notes)
       VALUES (?, ?, toTimestamp(now()), ?, ?, ?)
       USING TTL 7776000`,
      [patientId, drug_id, dose_taken, req.user.doctor_id, notes || null],
    );

    await logAudit({
      patientId,
      actorId: req.user.doctor_id,
      actorName: `${req.user.first_name} ${req.user.last_name}`,
      action: 'LOG_DOSE',
      entityType: 'medication_log',
      entityId: drug_id,
      changes: { dose_taken },
      ip: req.ip,
    });

    res.status(201).json({ message: 'Dose logged' });
  } catch (err) {
    next(err);
  }
});

// GET /api/patients/:id/medications/:drugId/log?days=30  — Q3
router.get('/:drugId/log', async (req, res, next) => {
  try {
    const { id: patientId, drugId } = req.params;
    const days = Math.min(parseInt(req.query.days, 10) || 30, 365);

    const since = new Date();
    since.setDate(since.getDate() - days);

    const result = await client.execute(
      `SELECT * FROM medication_log
       WHERE patient_id = ? AND drug_id = ? AND taken_at >= ?`,
      [patientId, drugId, since],
    );

    res.json(result.rows.map((r) => ({
      patient_id: r.patient_id?.toString(),
      drug_id: r.drug_id?.toString(),
      taken_at: r.taken_at,
      dose_taken: r.dose_taken,
      administered_by: r.administered_by?.toString(),
      notes: r.notes,
    })));
  } catch (err) {
    next(err);
  }
});

export default router;
