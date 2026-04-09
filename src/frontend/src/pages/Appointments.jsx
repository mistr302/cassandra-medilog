import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import API from '../api/routes';
import Modal from '../components/Modal';
import Loader from '../components/Loader';
import { Plus, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';

export default function Appointments() {
  const { user } = useAuth();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const fetch = useCallback(() => {
    if (!user?.doctor_id) return;
    setLoading(true);
    api.get(API.appointments.byDoctor(user.doctor_id), { date })
      .then((data) => setAppointments(Array.isArray(data) ? data : data.appointments || []))
      .catch(() => setAppointments([]))
      .finally(() => setLoading(false));
  }, [user, date]);

  useEffect(fetch, [fetch]);

  const shiftDate = (days) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    setDate(d.toISOString().slice(0, 10));
  };

  const formatDate = (d) =>
    new Date(d + 'T00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  const updateStatus = async (appt, status) => {
    try {
      await api.put(API.appointments.update(appt.appt_id), { ...appt, status });
      fetch();
    } catch { /* ignore */ }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Appointments</h1>
          <p>Manage your schedule</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={18} /> New Appointment
        </button>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <button className="btn btn-secondary btn-sm" onClick={() => shiftDate(-1)}>
          <ChevronLeft size={16} />
        </button>
        <div style={{ minWidth: 240, textAlign: 'center' }}>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{ border: 'none', fontSize: '1rem', fontWeight: 600, textAlign: 'center', cursor: 'pointer' }}
          />
          <div className="text-secondary text-sm">{formatDate(date)}</div>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => shiftDate(1)}>
          <ChevronRight size={16} />
        </button>
        <button
          className="btn btn-secondary btn-sm"
          style={{ marginLeft: 8 }}
          onClick={() => setDate(new Date().toISOString().slice(0, 10))}
        >
          Today
        </button>
      </div>

      {loading ? (
        <Loader />
      ) : appointments.length === 0 ? (
        <div className="card">
          <div className="card-body empty-state">
            <CalendarDays size={40} />
            <p>No appointments on this day</p>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-body table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Patient</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((appt) => (
                  <tr key={appt.appt_id}>
                    <td style={{ fontWeight: 600 }}>
                      {appt.start_time ? appt.start_time.slice(0, 5) : '—'}
                    </td>
                    <td>
                      <Link
                        to={`/patients/${appt.patient_id}`}
                        style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 500 }}
                      >
                        {appt.patient_name}
                      </Link>
                    </td>
                    <td>{appt.reason || '—'}</td>
                    <td>
                      <span className={`badge ${
                        appt.status === 'completed' ? 'badge-green' :
                        appt.status === 'cancelled' ? 'badge-red' :
                        appt.status === 'in_progress' ? 'badge-yellow' :
                        'badge-blue'
                      }`}>
                        {appt.status || 'scheduled'}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        {appt.status !== 'completed' && appt.status !== 'cancelled' && (
                          <>
                            <button
                              className="btn btn-sm btn-secondary"
                              onClick={() => updateStatus(appt, 'completed')}
                            >
                              Complete
                            </button>
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => updateStatus(appt, 'cancelled')}
                            >
                              Cancel
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showCreate && (
        <CreateAppointmentModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); fetch(); }}
          date={date}
        />
      )}
    </div>
  );
}

function CreateAppointmentModal({ onClose, onCreated, date }) {
  const [form, setForm] = useState({
    patient_id: '', patient_name: '', appt_date: date,
    start_time: '', reason: '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (f) => (e) => setForm((prev) => ({ ...prev, [f]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post(API.appointments.create, form);
      onCreated();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  return (
    <Modal title="New Appointment" onClose={onClose}>
      {error && <div className="error-msg">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label>Patient ID</label>
            <input value={form.patient_id} onChange={set('patient_id')} required placeholder="UUID" />
          </div>
          <div className="form-group">
            <label>Patient Name</label>
            <input value={form.patient_name} onChange={set('patient_name')} required />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Date</label>
            <input type="date" value={form.appt_date} onChange={set('appt_date')} required />
          </div>
          <div className="form-group">
            <label>Start Time</label>
            <input type="time" value={form.start_time} onChange={set('start_time')} required />
          </div>
        </div>
        <div className="form-group">
          <label>Reason</label>
          <textarea value={form.reason} onChange={set('reason')} />
        </div>
        <button type="submit" className="btn btn-primary" disabled={saving} style={{ width: '100%', justifyContent: 'center' }}>
          {saving ? 'Saving...' : 'Schedule Appointment'}
        </button>
      </form>
    </Modal>
  );
}
