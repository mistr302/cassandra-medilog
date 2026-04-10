import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import client from '../db/client.js';
import config from '../config.js';

const router = Router();
const SALT_ROUNDS = 12;

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, first_name, last_name, role, specialization } = req.body;

    if (!email || !password || !first_name || !last_name) {
      return res.status(400).json({ error: 'email, password, first_name, and last_name are required' });
    }

    // Check if email already exists
    const existing = await client.execute('SELECT doctor_id FROM doctors WHERE email = ?', [email]);
    if (existing.rowLength > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const doctorId = uuidv4();
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const validRole = ['doctor', 'nurse', 'admin'].includes(role) ? role : 'doctor';

    await client.execute(
      `INSERT INTO doctors (doctor_id, email, password_hash, first_name, last_name, role, specialization, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, toTimestamp(now()))`,
      [doctorId, email, passwordHash, first_name, last_name, validRole, specialization || null],
    );

    const user = { doctor_id: doctorId, email, first_name, last_name, role: validRole, specialization };
    const token = jwt.sign(user, config.jwt.secret, { expiresIn: config.jwt.expiresIn });

    res.status(201).json({ token, user });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const result = await client.execute('SELECT * FROM doctors WHERE email = ?', [email]);
    console.log('[auth] Login attempt for:', email, '- found rows:', result.rowLength);
    if (result.rowLength === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const doctor = result.first();
    console.log('[auth] Doctor found:', doctor.email, '- has password_hash:', !!doctor.password_hash);
    const valid = await bcrypt.compare(password, doctor.password_hash);
    console.log('[auth] Password valid:', valid);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = {
      doctor_id: doctor.doctor_id.toString(),
      email: doctor.email,
      first_name: doctor.first_name,
      last_name: doctor.last_name,
      role: doctor.role,
      specialization: doctor.specialization,
    };
    const token = jwt.sign(user, config.jwt.secret, { expiresIn: config.jwt.expiresIn });

    res.json({ token, user });
  } catch (err) {
    next(err);
  }
});

export default router;
