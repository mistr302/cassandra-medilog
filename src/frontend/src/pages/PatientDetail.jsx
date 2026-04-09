import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import API from '../api/routes';
import Modal from '../components/Modal';
import Loader from '../components/Loader';
import {
  ArrowLeft,
  FileText,
  Pill,
  Activity,
  Shield,
  Plus,
  AlertTriangle,
} from 'lucide-react';

export default function PatientDetail() {
  const { id } = useParams();
  const [patient, setPatient] = useState(null);
  const [tab, setTab] = useState('examinations');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(API.patients.detail(id))
      .then(setPatient)
      .catch(() => setPatient(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Loader />;
  if (!patient) return <div className="empty-state"><p>Patient not found</p></div>;

  return (
    <div>
      <Link to="/patients" className="btn btn-secondary btn-sm mb-4" style={{ display: 'inline-flex' }}>
        <ArrowLeft size={16} /> Back to Patients
      </Link>

      <div className="patient-header">
        <div className="patient-avatar">
          {patient.first_name?.[0]}{patient.last_name?.[0]}
        </div>
        <div className="patient-info">
          <h2>{patient.first_name} {patient.last_name}</h2>
          <div className="patient-meta">
            <span>DOB: {patient.birth_date || '—'}</span>
            <span>ID: {patient.national_id || '—'}</span>
            {patient.blood_type && <span className="badge badge-red">{patient.blood_type}</span>}
          </div>
          {patient.allergies && patient.allergies.length > 0 && (
            <div className="mt-2 flex gap-2 items-center">
              <AlertTriangle size={14} color="var(--danger)" />
              {patient.allergies.map((a) => <span key={a} className="tag">{a}</span>)}
            </div>
          )}
        </div>
      </div>

      <div className="detail-grid">
        <InfoCard label="Phone" value={patient.phone} />
        <InfoCard label="Email" value={patient.email} />
      </div>

      <div className="tabs">
        {[
          { key: 'examinations', icon: FileText,  label: 'Examinations' },
          { key: 'prescriptions', icon: Pill,     label: 'Prescriptions' },
          { key: 'medications',  icon: Activity,  label: 'Medication Log' },
          { key: 'audit',        icon: Shield,    label: 'Audit Log' },
        ].map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            className={`tab ${tab === key ? 'active' : ''}`}
            onClick={() => setTab(key)}
          >
            <Icon size={15} style={{ marginRight: 6, verticalAlign: -2 }} />
            {label}
          </button>
        ))}
      </div>

      {tab === 'examinations'  && <ExaminationsTab patientId={id} />}
      {tab === 'prescriptions' && <PrescriptionsTab patientId={id} />}
      {tab === 'medications'   && <MedicationsTab patientId={id} />}
      {tab === 'audit'         && <AuditTab patientId={id} />}
    </div>
  );
}

function InfoCard({ label, value }) {
  return (
    <div className="card" style={{ padding: '14px 20px' }}>
      <span className="text-secondary text-sm">{label}</span>
      <div style={{ fontWeight: 500, marginTop: 2 }}>{value || '—'}</div>
    </div>
  );
}

/* ── Examinations Tab ─────────────────────────────────────────── */
function ExaminationsTab({ patientId }) {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const fetch = useCallback(() => {
    setLoading(true);
    api.get(API.examinations.list(patientId))
      .then((data) => setExams(Array.isArray(data) ? data : data.examinations || []))
      .catch(() => setExams([]))
      .finally(() => setLoading(false));
  }, [patientId]);

  useEffect(fetch, [fetch]);

  if (loading) return <Loader />;

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <span className="text-secondary text-sm">{exams.length} examination(s)</span>
        <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
          <Plus size={16} /> Add Examination
        </button>
      </div>
      {exams.length === 0 ? (
        <div className="empty-state"><p>No examinations recorded</p></div>
      ) : (
        <div className="card">
          <div className="card-body table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Doctor</th>
                  <th>Diagnosis</th>
                  <th>ICD-10</th>
                  <th>Notes</th>
                  <th>Follow-up</th>
                </tr>
              </thead>
              <tbody>
                {exams.map((ex) => (
                  <tr key={ex.exam_id}>
                    <td>{ex.examined_at ? new Date(ex.examined_at).toLocaleDateString() : '—'}</td>
                    <td>{ex.doctor_name || '—'}</td>
                    <td style={{ fontWeight: 500 }}>{ex.diagnosis || '—'}</td>
                    <td><span className="badge badge-gray">{ex.icd10_code || '—'}</span></td>
                    <td className="truncate" style={{ maxWidth: 200 }}>{ex.notes || '—'}</td>
                    <td>{ex.follow_up || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {showCreate && (
        <CreateExamModal
          patientId={patientId}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); fetch(); }}
        />
      )}
    </>
  );
}

function CreateExamModal({ patientId, onClose, onCreated }) {
  const [form, setForm] = useState({ diagnosis: '', notes: '', icd10_code: '', follow_up: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (f) => (e) => setForm((prev) => ({ ...prev, [f]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post(API.examinations.create(patientId), form);
      onCreated();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  return (
    <Modal title="New Examination" onClose={onClose}>
      {error && <div className="error-msg">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Diagnosis</label>
          <input value={form.diagnosis} onChange={set('diagnosis')} required />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>ICD-10 Code</label>
            <input value={form.icd10_code} onChange={set('icd10_code')} placeholder="e.g. J06.9" />
          </div>
          <div className="form-group">
            <label>Follow-up Date</label>
            <input type="date" value={form.follow_up} onChange={set('follow_up')} />
          </div>
        </div>
        <div className="form-group">
          <label>Notes</label>
          <textarea value={form.notes} onChange={set('notes')} />
        </div>
        <button type="submit" className="btn btn-primary" disabled={saving} style={{ width: '100%', justifyContent: 'center' }}>
          {saving ? 'Saving...' : 'Save Examination'}
        </button>
      </form>
    </Modal>
  );
}

/* ── Prescriptions Tab ────────────────────────────────────────── */
function PrescriptionsTab({ patientId }) {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [interactions, setInteractions] = useState(null);

  const fetch = useCallback(() => {
    setLoading(true);
    api.get(API.prescriptions.list(patientId))
      .then((data) => setPrescriptions(Array.isArray(data) ? data : data.prescriptions || []))
      .catch(() => setPrescriptions([]))
      .finally(() => setLoading(false));
  }, [patientId]);

  useEffect(fetch, [fetch]);

  const checkInteractions = async () => {
    try {
      const data = await api.get(API.drugs.patientCheck(patientId));
      setInteractions(data);
    } catch {
      setInteractions({ interactions: [] });
    }
  };

  if (loading) return <Loader />;

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <span className="text-secondary text-sm">{prescriptions.length} prescription(s)</span>
        <div className="flex gap-2">
          <button className="btn btn-secondary btn-sm" onClick={checkInteractions}>
            <AlertTriangle size={16} /> Check Interactions
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
            <Plus size={16} /> Add Prescription
          </button>
        </div>
      </div>

      {interactions && (
        <div className="card mb-4" style={{ borderColor: interactions.interactions?.length > 0 ? 'var(--danger)' : 'var(--accent)' }}>
          <div className="card-body">
            {interactions.interactions?.length > 0 ? (
              <>
                <div className="flex items-center gap-2" style={{ color: 'var(--danger)', fontWeight: 600, marginBottom: 8 }}>
                  <AlertTriangle size={18} /> Drug Interactions Found
                </div>
                {interactions.interactions.map((i, idx) => (
                  <div key={idx} style={{ marginBottom: 8, fontSize: '0.88rem' }}>
                    <span className={`badge ${i.severity === 'severe' ? 'badge-red' : i.severity === 'moderate' ? 'badge-yellow' : 'badge-blue'}`}>
                      {i.severity}
                    </span>{' '}
                    <strong>{i.drug_a_name}</strong> + <strong>{i.drug_b_name}</strong>: {i.description}
                  </div>
                ))}
              </>
            ) : (
              <div className="flex items-center gap-2" style={{ color: 'var(--accent)', fontWeight: 500 }}>
                No interactions found between active prescriptions.
              </div>
            )}
          </div>
        </div>
      )}

      {prescriptions.length === 0 ? (
        <div className="empty-state"><p>No prescriptions</p></div>
      ) : (
        <div className="card">
          <div className="card-body table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Drug</th>
                  <th>Dosage</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {prescriptions.map((p) => (
                  <tr key={p.drug_id}>
                    <td style={{ fontWeight: 500 }}>{p.drug_name}</td>
                    <td>{p.dosage}</td>
                    <td>{p.start_date || '—'}</td>
                    <td>{p.end_date || '—'}</td>
                    <td>
                      <span className={`badge ${p.active ? 'badge-green' : 'badge-gray'}`}>
                        {p.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showCreate && (
        <CreatePrescriptionModal
          patientId={patientId}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); fetch(); }}
        />
      )}
    </>
  );
}

function CreatePrescriptionModal({ patientId, onClose, onCreated }) {
  const [form, setForm] = useState({ drug_name: '', dosage: '', start_date: '', end_date: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (f) => (e) => setForm((prev) => ({ ...prev, [f]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post(API.prescriptions.create(patientId), { ...form, active: true });
      onCreated();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  return (
    <Modal title="New Prescription" onClose={onClose}>
      {error && <div className="error-msg">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Drug Name</label>
          <input value={form.drug_name} onChange={set('drug_name')} required />
        </div>
        <div className="form-group">
          <label>Dosage</label>
          <input value={form.dosage} onChange={set('dosage')} placeholder="e.g. 500mg twice daily" required />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Start Date</label>
            <input type="date" value={form.start_date} onChange={set('start_date')} required />
          </div>
          <div className="form-group">
            <label>End Date</label>
            <input type="date" value={form.end_date} onChange={set('end_date')} />
          </div>
        </div>
        <button type="submit" className="btn btn-primary" disabled={saving} style={{ width: '100%', justifyContent: 'center' }}>
          {saving ? 'Saving...' : 'Save Prescription'}
        </button>
      </form>
    </Modal>
  );
}

/* ── Medications Tab ──────────────────────────────────────────── */
function MedicationsTab({ patientId }) {
  const [prescriptions, setPrescriptions] = useState([]);
  const [selectedDrug, setSelectedDrug] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [logLoading, setLogLoading] = useState(false);
  const [showLog, setShowLog] = useState(false);

  useEffect(() => {
    api.get(API.prescriptions.list(patientId))
      .then((data) => {
        const list = Array.isArray(data) ? data : data.prescriptions || [];
        setPrescriptions(list.filter((p) => p.active));
      })
      .catch(() => setPrescriptions([]))
      .finally(() => setLoading(false));
  }, [patientId]);

  const viewHistory = async (drug) => {
    setSelectedDrug(drug);
    setLogLoading(true);
    try {
      const data = await api.get(API.medications.history(patientId, drug.drug_id), { days: 30 });
      setLogs(Array.isArray(data) ? data : data.logs || []);
    } catch {
      setLogs([]);
    } finally {
      setLogLoading(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <span className="text-secondary text-sm">Active medications</span>
        <button className="btn btn-primary btn-sm" onClick={() => setShowLog(true)}>
          <Plus size={16} /> Log Dose
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 20 }}>
        <div className="card">
          <div className="card-header"><h3>Medications</h3></div>
          <div className="card-body">
            {prescriptions.length === 0 ? (
              <p className="text-secondary text-sm">No active medications</p>
            ) : (
              prescriptions.map((p) => (
                <div
                  key={p.drug_id}
                  onClick={() => viewHistory(p)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 'var(--radius)',
                    cursor: 'pointer',
                    marginBottom: 4,
                    background: selectedDrug?.drug_id === p.drug_id ? 'var(--primary-light)' : 'transparent',
                    fontWeight: selectedDrug?.drug_id === p.drug_id ? 600 : 400,
                  }}
                >
                  {p.drug_name}
                  <div className="text-secondary text-sm">{p.dosage}</div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>{selectedDrug ? `${selectedDrug.drug_name} — Last 30 Days` : 'Dosage History'}</h3>
          </div>
          <div className="card-body">
            {!selectedDrug ? (
              <p className="text-secondary text-sm">Select a medication to view history</p>
            ) : logLoading ? (
              <Loader />
            ) : logs.length === 0 ? (
              <p className="text-secondary text-sm">No doses logged in the last 30 days</p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Date & Time</th><th>Dose</th><th>Notes</th></tr>
                  </thead>
                  <tbody>
                    {logs.map((l, i) => (
                      <tr key={i}>
                        <td>{l.taken_at ? new Date(l.taken_at).toLocaleString() : '—'}</td>
                        <td>{l.dose_taken}</td>
                        <td>{l.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {showLog && (
        <LogDoseModal
          patientId={patientId}
          prescriptions={prescriptions}
          onClose={() => setShowLog(false)}
          onLogged={() => { setShowLog(false); if (selectedDrug) viewHistory(selectedDrug); }}
        />
      )}
    </>
  );
}

function LogDoseModal({ patientId, prescriptions, onClose, onLogged }) {
  const [form, setForm] = useState({ drug_id: '', dose_taken: '', notes: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (f) => (e) => setForm((prev) => ({ ...prev, [f]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post(API.medications.log(patientId), form);
      onLogged();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  return (
    <Modal title="Log Dose" onClose={onClose}>
      {error && <div className="error-msg">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Medication</label>
          <select value={form.drug_id} onChange={set('drug_id')} required>
            <option value="">Select medication...</option>
            {prescriptions.map((p) => (
              <option key={p.drug_id} value={p.drug_id}>{p.drug_name} ({p.dosage})</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Dose Taken</label>
          <input value={form.dose_taken} onChange={set('dose_taken')} placeholder="e.g. 500mg" required />
        </div>
        <div className="form-group">
          <label>Notes</label>
          <textarea value={form.notes} onChange={set('notes')} />
        </div>
        <button type="submit" className="btn btn-primary" disabled={saving} style={{ width: '100%', justifyContent: 'center' }}>
          {saving ? 'Logging...' : 'Log Dose'}
        </button>
      </form>
    </Modal>
  );
}

/* ── Audit Tab ────────────────────────────────────────────────── */
function AuditTab({ patientId }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(API.audit.list(patientId))
      .then((data) => setLogs(Array.isArray(data) ? data : data.logs || []))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, [patientId]);

  if (loading) return <Loader />;

  return logs.length === 0 ? (
    <div className="empty-state"><p>No audit records</p></div>
  ) : (
    <div className="card">
      <div className="card-body table-wrap">
        <table>
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Actor</th>
              <th>Action</th>
              <th>Entity</th>
              <th>Changes</th>
              <th>IP</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l, i) => (
              <tr key={i}>
                <td>{l.event_at ? new Date(l.event_at).toLocaleString() : '—'}</td>
                <td>{l.actor_name || '—'}</td>
                <td><span className="badge badge-blue">{l.action}</span></td>
                <td>{l.entity_type || '—'}</td>
                <td className="truncate" style={{ maxWidth: 200 }}>{l.changes || '—'}</td>
                <td className="text-secondary text-sm">{l.ip_address || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
