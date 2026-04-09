import { useState, useEffect } from 'react';
import { api } from '../api/client';
import API from '../api/routes';
import Loader from '../components/Loader';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { Pill, Stethoscope } from 'lucide-react';

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function Analytics() {
  const [tab, setTab] = useState('prescriptions');
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [prescriptionData, setPrescriptionData] = useState([]);
  const [diagnosisData, setDiagnosisData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const fetches = [
      api.get(API.analytics.prescriptions, { month })
        .then((d) => setPrescriptionData(Array.isArray(d) ? d : d.stats || []))
        .catch(() => setPrescriptionData([])),
      api.get(API.analytics.diagnoses, { month })
        .then((d) => setDiagnosisData(Array.isArray(d) ? d : d.stats || []))
        .catch(() => setDiagnosisData([])),
    ];
    Promise.all(fetches).finally(() => setLoading(false));
  }, [month]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Analytics</h1>
          <p>Prescription and diagnosis statistics</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-secondary text-sm" style={{ marginRight: 4 }}>Month:</label>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            style={{ maxWidth: 180 }}
          />
        </div>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'prescriptions' ? 'active' : ''}`} onClick={() => setTab('prescriptions')}>
          <Pill size={15} style={{ marginRight: 6, verticalAlign: -2 }} /> Prescriptions
        </button>
        <button className={`tab ${tab === 'diagnoses' ? 'active' : ''}`} onClick={() => setTab('diagnoses')}>
          <Stethoscope size={15} style={{ marginRight: 6, verticalAlign: -2 }} /> Diagnoses
        </button>
      </div>

      {loading ? (
        <Loader />
      ) : tab === 'prescriptions' ? (
        <PrescriptionStats data={prescriptionData} />
      ) : (
        <DiagnosisStats data={diagnosisData} />
      )}
    </div>
  );
}

function PrescriptionStats({ data }) {
  if (data.length === 0) {
    return <div className="card"><div className="card-body empty-state"><p>No prescription data for this month</p></div></div>;
  }

  const chartData = data.map((d) => ({
    name: d.drug_name || d.drug_id?.slice(0, 8),
    count: d.count,
  })).sort((a, b) => b.count - a.count).slice(0, 15);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
      <div className="card">
        <div className="card-header"><h3>Prescriptions by Drug</h3></div>
        <div className="card-body" style={{ height: 400 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 13 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#2563eb" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3>Top Prescriptions</h3></div>
        <div className="card-body table-wrap">
          <table>
            <thead><tr><th>#</th><th>Drug</th><th>Count</th></tr></thead>
            <tbody>
              {chartData.map((d, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td style={{ fontWeight: 500 }}>{d.name}</td>
                  <td><span className="badge badge-blue">{d.count}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function DiagnosisStats({ data }) {
  if (data.length === 0) {
    return <div className="card"><div className="card-body empty-state"><p>No diagnosis data for this month</p></div></div>;
  }

  const chartData = data.map((d, i) => ({
    name: d.diagnosis || d.icd10_code || `#${i + 1}`,
    value: d.count,
  })).sort((a, b) => b.value - a.value).slice(0, 10);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
      <div className="card">
        <div className="card-header"><h3>Diagnosis Distribution</h3></div>
        <div className="card-body" style={{ height: 400 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                outerRadius={130}
                dataKey="value"
                nameKey="name"
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                labelLine
              >
                {chartData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3>Top Diagnoses</h3></div>
        <div className="card-body table-wrap">
          <table>
            <thead><tr><th>#</th><th>Diagnosis</th><th>Count</th></tr></thead>
            <tbody>
              {chartData.map((d, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td style={{ fontWeight: 500 }}>{d.name}</td>
                  <td><span className="badge badge-blue">{d.value}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
