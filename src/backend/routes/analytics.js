import { Router } from 'express';
import client from '../db/client.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

// GET /api/analytics/prescriptions?month=YYYY-MM  — Q8
router.get('/prescriptions', async (req, res, next) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7);

    const result = await client.execute(
      'SELECT * FROM prescription_stats WHERE month = ?',
      [month],
    );

    // Resolve drug names from prescriptions_by_patient
    const drugIds = [...new Set(result.rows.map((r) => r.drug_id?.toString()))];
    const drugNameMap = {};
    // Scan prescriptions to build a drug_id -> drug_name lookup
    const prescResult = await client.execute(
      'SELECT drug_id, drug_name FROM prescriptions_by_patient',
      [],
      { fetchSize: 5000 },
    );
    for (const row of prescResult.rows) {
      drugNameMap[row.drug_id?.toString()] = row.drug_name;
    }

    const stats = result.rows.map((r) => {
      const drugId = r.drug_id?.toString();
      return {
        month: r.month,
        drug_id: drugId,
        drug_name: drugNameMap[drugId] || null,
        count: r.count?.toNumber?.() ?? Number(r.count),
      };
    });

    // Sort descending by count
    stats.sort((a, b) => b.count - a.count);
    res.json(stats);
  } catch (err) {
    next(err);
  }
});

// GET /api/analytics/diagnoses?month=YYYY-MM
// Scans examinations for the given month and aggregates diagnoses in-memory.
// For a small clinic this is acceptable; for scale, a dedicated counter table would be better.
router.get('/diagnoses', async (req, res, next) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7);
    const [year, mon] = month.split('-').map(Number);

    const start = new Date(year, mon - 1, 1);
    const end = new Date(year, mon, 1);

    // We need to scan examinations — no single-partition query possible here
    // so we pull all and filter. In production, add a materialised view or counter table.
    const result = await client.execute(
      'SELECT diagnosis, icd10_code, examined_at FROM examinations_by_patient',
      [],
      { fetchSize: 5000 },
    );

    const counts = {};
    for (const row of result.rows) {
      const ts = row.examined_at;
      if (ts >= start && ts < end) {
        const key = row.diagnosis || row.icd10_code || 'Unknown';
        counts[key] = (counts[key] || 0) + 1;
      }
    }

    const stats = Object.entries(counts)
      .map(([diagnosis, count]) => ({ diagnosis, count }))
      .sort((a, b) => b.count - a.count);

    res.json(stats);
  } catch (err) {
    next(err);
  }
});

export default router;
