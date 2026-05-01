import React, { useState } from 'react';
import { updateReport, deleteReport } from '../api';

function Badge({ severity, status }) {
  if (status === 'resolved') return <span className="badge badge-resolved">✓ Resolved</span>;
  const cls = severity === 'high' ? 'badge-high' : severity === 'moderate' ? 'badge-moderate' : 'badge-low';
  const label = severity === 'high' ? '⚠ High severity' : severity === 'moderate' ? '~ Moderate' : '✓ Low severity';
  return <span className={`badge ${cls}`}>{label}</span>;
}

export default function ReportDetail({ report, user, onClose, onRefresh }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const props = report.properties;

  async function handleResolve() {
    setLoading(true);
    try {
      await deleteReport(props.id);
      onRefresh();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to resolve report.');
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    setLoading(true);
    try {
      await updateReport(props.id, { severity: props.severity });
      onRefresh();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to confirm report.');
    } finally {
      setLoading(false);
    }
  }

  const typeLabels = {
    ice_snow: 'Ice / Snow', flooding: 'Flooding',
    blowdown: 'Blowdown', washout: 'Washout',
    closure: 'Closure', other: 'Other',
  };

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const h = Math.floor(diff / 3600000);
    if (h < 1) return 'Just now';
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  return (
    <div className="detail-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <h3>{props.trail_name}</h3>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#888' }}>✕</button>
      </div>

      <Badge severity={props.severity} status={props.status} />

      <div className="detail-meta">
        Reported {timeAgo(props.created_at)}
        {props.updated_at !== props.created_at && ` · Updated ${timeAgo(props.updated_at)}`}
      </div>

      {props.description && (
        <div className="detail-description">{props.description}</div>
      )}

      <div className="detail-row">
        <span className="detail-label">Type</span>
        <span>{typeLabels[props.condition_type] || props.condition_type}</span>
      </div>
      <div className="detail-row">
        <span className="detail-label">Severity</span>
        <span style={{ textTransform: 'capitalize' }}>{props.severity}</span>
      </div>
      <div className="detail-row">
        <span className="detail-label">Status</span>
        <span style={{ textTransform: 'capitalize' }}>{props.status}</span>
      </div>

      {error && <div className="form-error" style={{ marginTop: 10 }}>{error}</div>}

      {user && props.status === 'active' && (
        <div className="detail-actions">
          <button className="btn btn-sm" onClick={handleConfirm} disabled={loading}>
            👍 Confirm
          </button>
          <button className="btn btn-sm btn-danger" onClick={handleResolve} disabled={loading}>
            ✓ Resolve
          </button>
        </div>
      )}

      {!user && (
        <div style={{ marginTop: 12, fontSize: 12, color: '#888' }}>
          Sign in to confirm or resolve reports.
        </div>
      )}
    </div>
  );
}
