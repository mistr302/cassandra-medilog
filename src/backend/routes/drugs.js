import { Router } from 'express';
import client from '../db/client.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

// GET /api/drugs/:id1/interactions/:id2  — Q7
router.get('/:id1/interactions/:id2', async (req, res, next) => {
  try {
    const { id1, id2 } = req.params;

    const result = await client.execute(
      'SELECT * FROM drug_interactions WHERE drug_id_a = ? AND drug_id_b = ?',
      [id1, id2],
    );

    if (result.rowLength === 0) {
      return res.json({ interaction: null, message: 'No known interaction' });
    }

    const row = result.first();
    res.json({
      interaction: {
        drug_id_a: row.drug_id_a?.toString(),
        drug_id_b: row.drug_id_b?.toString(),
        severity: row.severity,
        description: row.description,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/patients/:patientId/interaction-check
// Checks all active prescriptions for a patient against each other
router.get('/patients/:patientId/interaction-check', async (req, res, next) => {
  try {
    const patientId = req.params.patientId;

    // Fetch active prescriptions
    const prescResult = await client.execute(
      'SELECT drug_id, drug_name FROM prescriptions_by_patient WHERE patient_id = ?',
      [patientId],
    );

    const activeDrugs = prescResult.rows.filter((r) => r.active !== false);

    if (activeDrugs.length < 2) {
      return res.json({ interactions: [] });
    }

    // Check each pair
    const interactions = [];
    for (let i = 0; i < activeDrugs.length; i++) {
      for (let j = i + 1; j < activeDrugs.length; j++) {
        const a = activeDrugs[i];
        const b = activeDrugs[j];

        const result = await client.execute(
          'SELECT * FROM drug_interactions WHERE drug_id_a = ? AND drug_id_b = ?',
          [a.drug_id, b.drug_id],
        );

        if (result.rowLength > 0) {
          const row = result.first();
          interactions.push({
            drug_a_id: a.drug_id?.toString(),
            drug_a_name: a.drug_name,
            drug_b_id: b.drug_id?.toString(),
            drug_b_name: b.drug_name,
            severity: row.severity,
            description: row.description,
          });
        }
      }
    }

    res.json({ interactions });
  } catch (err) {
    next(err);
  }
});

export default router;
