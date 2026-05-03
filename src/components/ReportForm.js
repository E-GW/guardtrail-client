import React, { useState } from 'react';
import { createReport } from '../api';

const CONDITION_TYPES = [
  { value: 'ice_snow', label: 'Ice / Snow' },
  { value: 'flooding', label: 'Flooding' },
  { value: 'blowdown', label: 'Tree blowdown' },
  { value: 'washout', label: 'Washout' },
  { value: 'closure', label: 'Closure' },
  { value: 'other', label: 'Other' },
];

const SEVERITIES = [
  { value: 'low', label: 'Low' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'high', label: 'High' },
];

export default function ReportForm({ onClose, onSuccess, defaultLat, defaultLng }) {
  const [form, setForm] = useState({
    trail_name: '',
    condition_type: 'ice_snow',
    severity: 'moderate',
    description: '',
    lat: defaultLat || '',
    lng: defaultLng || '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!form.trail_name.trim()) return setError('Trail name is required.');
    if (!form.lat || !form.lng) return setError('Location coordinates are required.');

    setLoading(true);
    try {
      await createReport(form);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit report. Are you signed in?');
    } finally {
      setLoading(false);
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) return setError('Geolocation not supported by your browser.');
    navigator.geolocation.getCurrentPosition(
      pos => {
        set('lat', pos.coords.latitude.toFixed(6));
        set('lng', pos.coords.longitude.toFixed(6));
      },
      () => setError('Could not get your location.')
    );
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <span>Submit a trail report</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Trail name *</label>
              <input className="form-input" placeholder="e.g. Eagle Peak Trail"
                value={form.trail_name} onChange={e => set('trail_name', e.target.value)} required />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Condition type *</label>
                <select className="form-select" value={form.condition_type}
                  onChange={e => set('condition_type', e.target.value)}>
                  {CONDITION_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Severity *</label>
                <select className="form-select" value={form.severity}
                  onChange={e => set('severity', e.target.value)}>
                  {SEVERITIES.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-textarea"
                placeholder="Describe what you observed..."
                value={form.description} onChange={e => set('description', e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label">Location *</label>
              {form.lat && form.lng ? (
                <div style={{
                  padding: '9px 11px',
                  background: '#e6f1fb',
                  borderRadius: 6,
                  fontSize: 13,
                  color: '#185fa5',
                  border: '1px solid #b3d4f0',
                }}>
                  📍 Pin placed at {parseFloat(form.lat).toFixed(4)}, {parseFloat(form.lng).toFixed(4)}
                  <button
                    type="button"
                    style={{
                      marginLeft: 10,
                      background: 'none',
                      border: 'none',
                      color: '#185fa5',
                      cursor: 'pointer',
                      fontSize: 12,
                      textDecoration: 'underline',
                    }}
                    onClick={() => { set('lat', ''); set('lng', ''); }}
                  >
                    Clear
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ fontSize: 13, color: '#171717' }}>
                    Close this form and click the map to place a pin, or enter coordinates manually:
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input className="form-input" placeholder="Latitude" type="number"
                      step="any" value={form.lat} onChange={e => set('lat', e.target.value)} />
                    <input className="form-input" placeholder="Longitude" type="number"
                      step="any" value={form.lng} onChange={e => set('lng', e.target.value)} />
                  </div>
                  <button type="button" className="btn btn-sm"
                    style={{ alignSelf: 'flex-start' }} onClick={useMyLocation}>
                    📍 Use my current location
                  </button>
                </div>
              )}
            </div>

            {error && <div className="form-error">{error}</div>}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
