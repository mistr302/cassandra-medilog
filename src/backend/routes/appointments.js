import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import client from '../db/client.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

// GET /api/doctors/:id/appointments?date=YYYY-MM-DD  — Q6
router.get('/doctors/:id/appointments', async (req, res, next) => {
  try {
    const doctorId = req.params.id;
    const date = req.query.date;

    if (!date) {
      return res.status(400).json({ error: 'date query parameter is required (YYYY-MM-DD)' });
    }

    const result = await client.execute(
      'SELECT * FROM appointments_by_doctor_day WHERE doctor_id = ? AND appt_date = ?',
      [doctorId, date],
    );

    res.json(result.rows.map(formatAppointment));
  } catch (err) {
    next(err);
  }
});

// POST /api/appointments
router.post('/appointments', authorize('doctor', 'nurse', 'admin'), async (req, res, next) => {
  try {
    const { patient_id, patient_name, appt_date, start_time, reason } = req.body;

    if (!patient_id || !appt_date || !start_time) {
      return res.status(400).json({ error: 'patient_id, appt_date, and start_time are required' });
    }

    const apptId = uuidv4();
    const doctorId = req.user.doctor_id;

    // Convert start_time string (HH:MM or HH:MM:SS) to a Cassandra LocalTime-compatible value
    const timeParts = start_time.split(':').map(Number);
    const nanos = BigInt((timeParts[0] * 3600 + timeParts[1] * 60 + (timeParts[2] || 0)) * 1e9);

    await client.execute(
      `INSERT INTO appointments_by_doctor_day
        (doctor_id, appt_date, start_time, appt_id, patient_id, patient_name, reason, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'scheduled')`,
      [
        doctorId,
        appt_date,
        { type: 'LocalTime', value: nanos },
        apptId,
        patient_id,
        patient_name || '',
        reason || null,
      ],
      { hints: [null, null, 'time', null, null, null, null] },
    );

    res.status(201).json({ appt_id: apptId, status: 'scheduled' });
  } catch (err) {
    next(err);
  }
});

// PUT /api/appointments/:id
router.put('/appointments/:id', authorize('doctor', 'nurse', 'admin'), async (req, res, next) => {
  try {
    const { doctor_id, appt_date, start_time, patient_id, patient_name, reason, status } = req.body;

    // We need the full primary key to update in Cassandra
    const targetDoctorId = doctor_id || req.user.doctor_id;

    if (!appt_date || !start_time) {
      return res.status(400).json({ error: 'appt_date and start_time are required for update' });
    }

    const timeParts = start_time.split(':').map(Number);
    const nanos = BigInt((timeParts[0] * 3600 + timeParts[1] * 60 + (timeParts[2] || 0)) * 1e9);

    await client.execute(
      `UPDATE appointments_by_doctor_day
       SET patient_name = ?, reason = ?, status = ?, patient_id = ?
       WHERE doctor_id = ? AND appt_date = ? AND start_time = ? AND appt_id = ?`,
      [
        patient_name || null,
        reason || null,
        status || 'scheduled',
        patient_id || null,
        targetDoctorId,
        appt_date,
        { type: 'LocalTime', value: nanos },
        req.params.id,
      ],
      { hints: [null, null, null, null, null, null, 'time', null] },
    );

    res.json({ message: 'Appointment updated' });
  } catch (err) {
    next(err);
  }
});

function formatAppointment(row) {
  return {
    doctor_id: row.doctor_id?.toString(),
    appt_date: row.appt_date?.toLocalDate?.()?.toString() ?? row.appt_date,
    start_time: row.start_time?.toString() ?? row.start_time,
    appt_id: row.appt_id?.toString(),
    patient_id: row.patient_id?.toString(),
    patient_name: row.patient_name,
    reason: row.reason,
    status: row.status,
  };
}

export default router;
