import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import API from '../api/routes';
import Loader from '../components/Loader';
import {
  CalendarDays,
  Users,
  FileText,
  Clock,
} from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (!user?.doctor_id) return;
    api.get(API.appointments.byDoctor(user.doctor_id), { date: today })
      .then(setAppointments)
      .catch(() => setAppointments([]))
      .finally(() => setLoading(false));
  }, [user, today]);

  const now = new Date();
  const upcoming = appointments.filter((a) => {
    const apptTime = new Date(`${a.appt_date}T${a.start_time || '00:00'}`);
    return apptTime >= now;
  });

  if (loading) return <Loader />;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Good {now.getHours() < 12 ? 'morning' : now.getHours() < 18 ? 'afternoon' : 'evening'}, Dr. {user?.last_name}</h1>
          <p>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue"><CalendarDays size={22} /></div>
          <div className="stat-info">
            <h4>Today's Appointments</h4>
            <div className="stat-value">{appointments.length}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><Clock size={22} /></div>
          <div className="stat-info">
            <h4>Upcoming</h4>
            <div className="stat-value">{upcoming.length}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon yellow"><Users size={22} /></div>
          <div className="stat-info">
            <h4>Completed</h4>
            <div className="stat-value">{appointments.length - upcoming.length}</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Today's Schedule</h3>
          <Link to="/appointments" className="btn btn-secondary btn-sm">View All</Link>
        </div>
        <div className="card-body table-wrap">
          {appointments.length === 0 ? (
            <div className="empty-state">
              <CalendarDays size={40} />
              <p>No appointments scheduled for today</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Patient</th>
                  <th>Reason</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((appt) => (
                  <tr key={appt.appt_id}>
                    <td style={{ fontWeight: 600 }}>
                      {appt.start_time ? appt.start_time.slice(0, 5) : '—'}
                    </td>
                    <td>
                      <Link to={`/patients/${appt.patient_id}`} style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 500 }}>
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
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
