// ReportDetail.js
// Detail panel shown on the left side of the desktop layout when a user
// selects a report marker on the map. Shows full report information and
// provides Confirm and Resolve actions for authenticated users.

import React, { useState } from 'react';
import { updateReport, deleteReport } from '../api';

// Displays a colored severity badge. Shows a green "Resolved" badge
// if the report has been closed instead of a severity indicator.
function Badge({ severity, status }) {
  if (status === 'resolved') return <span className="badge badge-resolved">✓ Resolved</span>;
  const cls = severity === 'high' ? 'badge-high' : severity === 'moderate' ? 'badge-moderate' : 'badge-low';
  const label = severity === 'high' ? '⚠ High severity' : severity === 'moderate' ? '~ Moderate' : '✓ Low severity';
  return <span className={`badge ${cls}`}>{label}</span>;
}

// Props:
//   report — the full GeoJSON Feature object for the selected report
//   user — the currently signed-in user (null if not authenticated)
//   onClose — called when the user dismisses the panel
//   onRefresh — called after an action to reload the report list and map
export default function ReportDetail({ report, user, onClose, onRefresh }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Shorthand reference to the report's properties object
  const props = report.properties;

  // Resolves a report by calling the DELETE endpoint.
  // Regular users perform a soft delete (status → 'resolved').
  // Land managers can hard delete (record removed from database entirely).
  // After success, the panel closes and the map refreshes.
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

  // Confirms a report by sending a PUT request with the existing severity.
  // This signals that the reporting user independently observed the same condition.
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

  // Maps database condition type codes to human-readable display labels
  const typeLabels = {
    ice_snow: 'Ice / Snow', flooding: 'Flooding',
    blowdown: 'Blowdown', washout: 'Washout',
    closure: 'Closure', other: 'Other',
  };

  // Converts a UTC timestamp to a relative string like "3h ago" or "2d ago"
  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const h = Math.floor(diff / 3600000);
    if (h < 1) return 'Just now';
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  return (
    <div className="detail-panel">

      {/* Panel header with trail name and close button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <h3>{props.trail_name}</h3>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#888' }}>✕</button>
      </div>

      {/* Severity or resolved badge */}
      <Badge severity={props.severity} status={props.status} />

      {/* Timestamps — shows update time only if the report has been edited */}
      <div className="detail-meta">
        Reported {timeAgo(props.created_at)}
        {props.updated_at !== props.created_at && ` · Updated ${timeAgo(props.updated_at)}`}
      </div>

      {/* Optional description — only rendered if the user provided one */}
      {props.description && (
        <div className="detail-description">{props.description}</div>
      )}

      {/* Key-value detail rows */}
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

      {/* Action buttons — only shown to signed-in users on active reports */}
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

      {/* Prompt unauthenticated users to sign in to take action */}
      {!user && (
        <div style={{ marginTop: 12, fontSize: 12, color: '#888' }}>
          Sign in to confirm or resolve reports.
        </div>
      )}
    </div>
  );
}
