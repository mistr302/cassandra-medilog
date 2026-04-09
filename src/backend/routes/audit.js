import { Router } from 'express';
import client from '../db/client.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router({ mergeParams: true });

router.use(authenticate);
router.use(authorize('doctor', 'admin'));

// GET /api/patients/:id/audit?from=&to=&action=  — Q5
router.get('/', async (req, res, next) => {
  try {
    const patientId = req.params.id;
    const { from, to, action } = req.query;

    let query = 'SELECT * FROM patient_audit_log WHERE patient_id = ?';
    const params = [patientId];

    if (from && to) {
      query += ' AND event_at >= ? AND event_at <= ?';
      params.push(new Date(from), new Date(to));
    } else if (from) {
      query += ' AND event_at >= ?';
      params.push(new Date(from));
    } else if (to) {
      query += ' AND event_at <= ?';
      params.push(new Date(to));
    }

    const result = await client.execute(query, params);

    let rows = result.rows;
    if (action) {
      rows = rows.filter((r) => r.action === action);
    }

    res.json(rows.map((r) => ({
      patient_id: r.patient_id?.toString(),
      event_at: r.event_at,
      event_id: r.event_id?.toString(),
      actor_id: r.actor_id?.toString(),
      actor_name: r.actor_name,
      action: r.action,
      entity_type: r.entity_type,
      entity_id: r.entity_id?.toString(),
      changes: r.changes,
      ip_address: r.ip_address,
    })));
  } catch (err) {
    next(err);
  }
});

export default router;
