import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import API from '../api/routes';
import Modal from '../components/Modal';
import Loader from '../components/Loader';
import { Search, Plus, User } from 'lucide-react';

export default function PatientList() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const fetchPatients = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search.trim()) params.lastName = search.trim();
      const data = await api.get(API.patients.list, params);
      setPatients(Array.isArray(data) ? data : data.patients || []);
    } catch {
      setPatients([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(fetchPatients, 300);
    return () => clearTimeout(timer);
  }, [fetchPatients]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Patients</h1>
          <p>Manage patient records</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={18} /> New Patient
        </button>
      </div>

      <div className="search-bar mb-4">
        <Search size={18} color="var(--text-secondary)" />
        <input
          placeholder="Search by last name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <Loader />
      ) : (
        <div className="card">
          <div className="card-body table-wrap">
            {patients.length === 0 ? (
              <div className="empty-state">
                <User size={40} />
                <p>No patients found</p>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Date of Birth</th>
                    <th>National ID</th>
                    <th>Blood Type</th>
                    <th>Phone</th>
                    <th>Allergies</th>
                  </tr>
                </thead>
                <tbody>
                  {patients.map((p) => (
                    <tr key={p.patient_id}>
                      <td>
                        <Link
                          to={`/patients/${p.patient_id}`}
                          style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 500 }}
                        >
                          {p.first_name} {p.last_name}
                        </Link>
                      </td>
                      <td>{p.birth_date || '—'}</td>
                      <td>{p.national_id || '—'}</td>
                      <td>{p.blood_type ? <span className="badge badge-red">{p.blood_type}</span> : '—'}</td>
                      <td>{p.phone || '—'}</td>
                      <td>
                        {p.allergies && p.allergies.length > 0
                          ? p.allergies.map((a) => <span key={a} className="tag">{a}</span>)
                          : <span className="text-secondary text-sm">None</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {showCreate && (
        <CreatePatientModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); fetchPatients(); }}
        />
      )}
    </div>
  );
}

function CreatePatientModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    first_name: '', last_name: '', birth_date: '', national_id: '',
    blood_type: '', phone: '', email: '', allergies: '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        allergies: form.allergies
          ? form.allergies.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
      };
      await api.post(API.patients.create, payload);
      onCreated();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Register New Patient" onClose={onClose}>
      {error && <div className="error-msg">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label>First Name</label>
            <input value={form.first_name} onChange={set('first_name')} required />
          </div>
          <div className="form-group">
            <label>Last Name</label>
            <input value={form.last_name} onChange={set('last_name')} required />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Date of Birth</label>
            <input type="date" value={form.birth_date} onChange={set('birth_date')} required />
          </div>
          <div className="form-group">
            <label>National ID</label>
            <input value={form.national_id} onChange={set('national_id')} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Blood Type</label>
            <select value={form.blood_type} onChange={set('blood_type')}>
              <option value="">Select...</option>
              {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Phone</label>
            <input value={form.phone} onChange={set('phone')} />
          </div>
        </div>
        <div className="form-group">
          <label>Email</label>
          <input type="email" value={form.email} onChange={set('email')} />
        </div>
        <div className="form-group">
          <label>Allergies (comma-separated)</label>
          <input value={form.allergies} onChange={set('allergies')} placeholder="Penicillin, Aspirin" />
        </div>
        <button type="submit" className="btn btn-primary" disabled={saving} style={{ width: '100%', justifyContent: 'center' }}>
          {saving ? 'Saving...' : 'Register Patient'}
        </button>
      </form>
    </Modal>
  );
}
