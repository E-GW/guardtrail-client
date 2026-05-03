import React, { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getReports } from '../api';
import { updateReport, deleteReport } from '../api';

const SEVERITY_COLORS = {
  high: '#c94040',
  moderate: '#bf7520',
  low: '#2060a8',
};

const TYPE_LABELS = {
  ice_snow: 'Ice / Snow',
  flooding: 'Flooding',
  blowdown: 'Blowdown',
  washout: 'Washout',
  closure: 'Closure',
  other: 'Other',
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return 'Just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function MapEventHandler({ onMoveEnd, onMapClick }) {
  useMapEvents({
    moveend: onMoveEnd,
    zoomend: onMoveEnd,
    click(e) {
      if (onMapClick) onMapClick(e.latlng.lat, e.latlng.lng);
    }
  });
  return null;
}

function Badge({ severity, status }) {
  if (status === 'resolved') return <span className="badge badge-resolved">✓ Resolved</span>;
  const cls = severity === 'high' ? 'badge-high' : severity === 'moderate' ? 'badge-moderate' : 'badge-low';
  const label = severity === 'high' ? '⚠ High' : severity === 'moderate' ? '~ Moderate' : '✓ Low';
  return <span className={`badge ${cls}`}>{label}</span>;
}

function MobileBottomSheet({ reports, onSelect }) {
  const [expanded, setExpanded] = useState(true);
  const [search, setSearch] = useState('');

  const filtered = reports.filter(r =>
    r.properties.trail_name.toLowerCase().includes(search.toLowerCase())
  );

  const COLLAPSED_HEIGHT = 52;
  const EXPANDED_HEIGHT = Math.min(window.innerHeight * 0.5, 400);

  return (
    <div
      className="mobile-bottom-sheet"
      style={{ height: expanded ? EXPANDED_HEIGHT : COLLAPSED_HEIGHT }}
    >
      {/* Drag handle bar */}
      <div
        className="sheet-handle-bar"
        onClick={() => setExpanded(e => !e)}
      />

      {/* Toggle label */}
      <button
        className="sheet-toggle-btn"
        onClick={() => setExpanded(e => !e)}
      >
        {expanded
          ? `▼ Hide list · ${reports.length} report${reports.length !== 1 ? 's' : ''}`
          : `▲ Show ${reports.length} report${reports.length !== 1 ? 's' : ''}`
        }
      </button>

      {/* Expandable content */}
      {expanded && (
        <>
          {/* Search bar */}
          <div className="sheet-search">
            <input
              className="form-input"
              style={{ minHeight: 36, fontSize: 13 }}
              placeholder="Search trails..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Report list */}
          <div className="sheet-content">
            {filtered.length === 0 && (
              <div style={{ padding: 14, color: '#888', fontSize: 13 }}>
                No reports found.
              </div>
            )}
            {filtered.map(report => (
              <div
                key={report.properties.id}
                className="report-item"
                onClick={() => onSelect(report)}
              >
                <div className="report-item-header">
                  <span className="report-item-title">
                    {report.properties.trail_name}
                  </span>
                  <Badge
                    severity={report.properties.severity}
                    status={report.properties.status}
                  />
                </div>
                <div className="report-item-meta">
                  {TYPE_LABELS[report.properties.condition_type]} · {timeAgo(report.properties.created_at)}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function MapView({
  user, onReportsLoaded, filterType, filterOptions,
  onFilterChange, reportCount, onMapClick, pendingPin, onShowReportForm
}) {
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [search, setSearch] = useState('');

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = { status: 'active' };
      if (filterType) params.type = filterType;
      const res = await getReports(params);
      const features = res.data.features || [];
      setReports(features);
      if (onReportsLoaded) onReportsLoaded(features);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  }, [filterType, onReportsLoaded]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const filteredReports = reports.filter(r =>
    r.properties.trail_name.toLowerCase().includes(search.toLowerCase())
  );

  async function handleResolve(report) {
    setActionLoading(true);
    setActionError('');
    try {
      await deleteReport(report.properties.id);
      setSelectedReport(null);
      fetchReports();
    } catch (err) {
      setActionError(err.response?.data?.error || 'Failed to resolve.');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleConfirm(report) {
    setActionLoading(true);
    setActionError('');
    try {
      await updateReport(report.properties.id, { severity: report.properties.severity });
      fetchReports();
    } catch (err) {
      setActionError(err.response?.data?.error || 'Failed to confirm.');
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <>
      {/* ── Sidebar ── */}
      <div className="sidebar">

        {/* Search */}
        <div className="sidebar-search">
          <input
            className="form-input"
            style={{ minHeight: 36 }}
            placeholder="Search trails..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Filter settings */}
        <div className="sidebar-filters">
          <div className="sidebar-filters-label">Filter Settings</div>
          <div className="filter-chips">
            {filterOptions.map(opt => (
              <button
                key={opt.label}
                className={`chip ${filterType === opt.value ? 'active' : ''}`}
                onClick={() => onFilterChange(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Records label */}
        <div className="sidebar-records-label">
          Records {loading ? '(loading...)' : `(${filteredReports.length})`}
        </div>

        {/* Report list */}
        <div className="report-list">
          {filteredReports.length === 0 && !loading && (
            <div style={{ padding: 14, color: '#888', fontSize: 13 }}>
              No reports found.
            </div>
          )}

          {filteredReports.map(report => (
            <div key={report.properties.id}>
              <div
                className={`report-item ${selectedReport?.properties.id === report.properties.id ? 'selected' : ''}`}
                onClick={() => setSelectedReport(
                  selectedReport?.properties.id === report.properties.id ? null : report
                )}
              >
                <div className="report-item-header">
                  <span className="report-item-title">{report.properties.trail_name}</span>
                  <Badge severity={report.properties.severity} status={report.properties.status} />
                </div>
                <div className="report-item-meta">
                  {TYPE_LABELS[report.properties.condition_type]} · {timeAgo(report.properties.created_at)}
                </div>
              </div>

              {/* Expanded detail inside sidebar */}
              {selectedReport?.properties.id === report.properties.id && (
                <div className="detail-section">
                  <h4>{report.properties.trail_name}</h4>
                  <div className="detail-meta">
                    {TYPE_LABELS[report.properties.condition_type]} · {timeAgo(report.properties.created_at)}
                  </div>
                  {report.properties.description && (
                    <div className="detail-description">{report.properties.description}</div>
                  )}
                  <div className="detail-row">
                    <span className="detail-label">Severity</span>
                    <span style={{ textTransform: 'capitalize' }}>{report.properties.severity}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Status</span>
                    <span style={{ textTransform: 'capitalize' }}>{report.properties.status}</span>
                  </div>
                  {actionError && <div className="form-error" style={{ marginTop: 6 }}>{actionError}</div>}
                  {user && report.properties.status === 'active' && (
                    <div className="detail-actions">
                      <button className="btn btn-sm" onClick={() => handleConfirm(report)} disabled={actionLoading}>
                        👍 Confirm
                      </button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleResolve(report)} disabled={actionLoading}>
                        ✓ Resolve
                      </button>
                    </div>
                  )}
                  {!user && (
                    <div style={{ marginTop: 8, fontSize: 12, color: '#888' }}>
                      Sign in to confirm or resolve.
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Sidebar footer */}
        <div className="sidebar-footer">
          {reportCount} active report{reportCount !== 1 ? 's' : ''}
        </div>
      </div>

      {/* ── Map ── */}
      <div className="map-wrapper">
        <div className="map-banner">
          📍 Click anywhere on the map to report a condition
        </div>

        <MapContainer
          center={[44.5, -89.5]}
          zoom={7}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution='Tiles &copy; Esri'
          />
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
            attribution=""
            opacity={1}
          />
          <MapEventHandler onMoveEnd={fetchReports} onMapClick={onMapClick} />

          {/* Pending pin */}
          {pendingPin && (
            <Marker
              position={[pendingPin.lat, pendingPin.lng]}
              icon={L.divIcon({
                className: '',
                html: `<div style="
                  width: 20px; height: 20px;
                  background: #1f4e79;
                  border: 3px solid #fff;
                  border-radius: 50%;
                  box-shadow: 0 2px 6px rgba(0,0,0,0.4);
                "></div>`,
                iconAnchor: [10, 10],
              })}
            />
          )}

          {/* Report markers */}
          {reports.map(report => {
            const [lng, lat] = report.geometry.coordinates;
            const color = SEVERITY_COLORS[report.properties.severity] || '#888';
            const isSelected = selectedReport?.properties.id === report.properties.id;
            return (
              <CircleMarker
                key={report.properties.id}
                center={[lat, lng]}
                radius={isSelected ? 14 : 10}
                pathOptions={{
                  color: isSelected ? '#fff' : color,
                  fillColor: color,
                  fillOpacity: 0.9,
                  weight: isSelected ? 3 : 1.5,
                }}
                eventHandlers={{
                  click: () => setSelectedReport(
                    selectedReport?.properties.id === report.properties.id ? null : report
                  )
                }}
              >
                <Popup>{report.properties.trail_name}</Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>

        {/* ── Legend ── */}
        <div className="map-legend">
          <div className="map-legend-title">Legend</div>
          <div className="legend-item">
            <div className="legend-dot" style={{ background: '#c94040' }}></div>
            High severity
          </div>
          <div className="legend-item">
            <div className="legend-dot" style={{ background: '#bf7520' }}></div>
            Moderate
          </div>
          <div className="legend-item">
            <div className="legend-dot" style={{ background: '#2060a8' }}></div>
            Low severity
          </div>
        </div>

        {/* ── Mobile bottom sheet ── */}
        <MobileBottomSheet reports={reports} onSelect={setSelectedReport} />
      </div>
    </>
  );
}
