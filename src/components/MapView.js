// MapView.js
// The core map component. Renders the satellite map, report markers,
// sidebar, legend, and mobile bottom sheet. Handles all map interactions
// including clicking to place report pins and fetching reports from the API.

import React, { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getReports } from '../api';
import { updateReport, deleteReport } from '../api';

// Color coding for report markers on the map by severity level
const SEVERITY_COLORS = {
  high: '#c94040',
  moderate: '#bf7520',
  low: '#2060a8',
};

// Human-readable labels for condition type codes stored in the database
const TYPE_LABELS = {
  ice_snow: 'Ice / Snow',
  flooding: 'Flooding',
  blowdown: 'Blowdown',
  washout: 'Washout',
  closure: 'Closure',
  other: 'Other',
};

// Converts a UTC timestamp to a relative time string (e.g. "3h ago")
// Used in both the sidebar list and the expanded detail view
function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return 'Just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// Invisible component that listens for Leaflet map events.
// useMapEvents must be used inside a MapContainer — it cannot live
// outside the map context, which is why it's a separate component.
function MapEventHandler({ onMoveEnd, onMapClick }) {
  useMapEvents({
    moveend: onMoveEnd,   // Fires when the user pans the map
    zoomend: onMoveEnd,   // Fires when the user zooms in or out
    click(e) {
      // Pass clicked lat/lng up to the parent to trigger the report form
      if (onMapClick) onMapClick(e.latlng.lat, e.latlng.lng);
    }
  });
  return null; // This component renders nothing — it only listens for events
}

// Displays a colored severity badge on each report item and in the detail panel.
// Shows "Resolved" in green if the report has been closed.
function Badge({ severity, status }) {
  if (status === 'resolved') return <span className="badge badge-resolved">✓ Resolved</span>;
  const cls = severity === 'high' ? 'badge-high' : severity === 'moderate' ? 'badge-moderate' : 'badge-low';
  const label = severity === 'high' ? '⚠ High' : severity === 'moderate' ? '~ Moderate' : '✓ Low';
  return <span className={`badge ${cls}`}>{label}</span>;
}

// Mobile-only bottom sheet that slides up from the bottom of the screen.
// Can be collapsed to a slim bar so users can see the full map,
// or expanded to show the full scrollable report list with a search bar.
function MobileBottomSheet({ reports, onSelect }) {
  const [expanded, setExpanded] = useState(true);
  const [search, setSearch] = useState('');

  // Filter reports by trail name as the user types in the search box
  const filtered = reports.filter(r =>
    r.properties.trail_name.toLowerCase().includes(search.toLowerCase())
  );

  // Height constants for the two sheet states
  const COLLAPSED_HEIGHT = 52;  // Just tall enough to show the toggle button
  const EXPANDED_HEIGHT = Math.min(window.innerHeight * 0.5, 400); // Max 50% of screen

  return (
    <div
      className="mobile-bottom-sheet"
      style={{ height: expanded ? EXPANDED_HEIGHT : COLLAPSED_HEIGHT }}
    >
      {/* Drag handle bar — tapping toggles expanded/collapsed state */}
      <div
        className="sheet-handle-bar"
        onClick={() => setExpanded(e => !e)}
      />

      {/* Toggle button showing report count and expand/collapse arrow */}
      <button
        className="sheet-toggle-btn"
        onClick={() => setExpanded(e => !e)}
      >
        {expanded
          ? `▼ Hide list · ${reports.length} report${reports.length !== 1 ? 's' : ''}`
          : `▲ Show ${reports.length} report${reports.length !== 1 ? 's' : ''}`
        }
      </button>

      {/* Sheet content — only rendered when expanded to save performance */}
      {expanded && (
        <>
          {/* Search input for filtering the report list on mobile */}
          <div className="sheet-search">
            <input
              className="form-input"
              style={{ minHeight: 36, fontSize: 13 }}
              placeholder="Search trails..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Scrollable list of filtered reports */}
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

// Main MapView component. Receives props from App.js including the current
// user, active filter, pending pin location, and event handler callbacks.
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

  // Fetches reports from the API. Wrapped in useCallback so it can be passed
  // to MapEventHandler without causing infinite re-renders — the function
  // reference only changes when filterType or onReportsLoaded changes.
  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = { status: 'active' };
      if (filterType) params.type = filterType; // Apply active filter chip if set
      const res = await getReports(params);
      const features = res.data.features || [];
      setReports(features);
      // Notify App.js of the current report count for the toolbar display
      if (onReportsLoaded) onReportsLoaded(features);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  }, [filterType, onReportsLoaded]);

  // Fetch reports on initial load and whenever the filter changes
  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Client-side search filtering — applied on top of the API filter results
  const filteredReports = reports.filter(r =>
    r.properties.trail_name.toLowerCase().includes(search.toLowerCase())
  );

  // Resolves a report by calling the DELETE endpoint.
  // For regular users this performs a soft delete (sets status to 'resolved').
  // For land managers this permanently removes the record.
  async function handleResolve(report) {
    setActionLoading(true);
    setActionError('');
    try {
      await deleteReport(report.properties.id);
      setSelectedReport(null);
      fetchReports(); // Refresh the map and list after resolving
    } catch (err) {
      setActionError(err.response?.data?.error || 'Failed to resolve.');
    } finally {
      setActionLoading(false);
    }
  }

  // Confirms a report by calling the PUT endpoint with the existing severity.
  // This increments the confirmation count, signaling other users the
  // condition has been independently verified.
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
      {/* ── Desktop sidebar ── */}
      {/* Hidden on mobile via CSS — replaced by the MobileBottomSheet */}
      <div className="sidebar">

        {/* Trail name search — filters the report list client-side */}
        <div className="sidebar-search">
          <input
            className="form-input"
            style={{ minHeight: 36 }}
            placeholder="Search trails..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Filter chips — sends the selected type to the API as a query param */}
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

        {/* Records count label */}
        <div className="sidebar-records-label">
          Records {loading ? '(loading...)' : `(${filteredReports.length})`}
        </div>

        {/* Scrollable report list */}
        <div className="report-list">
          {filteredReports.length === 0 && !loading && (
            <div style={{ padding: 14, color: '#888', fontSize: 13 }}>
              No reports found.
            </div>
          )}

          {filteredReports.map(report => (
            <div key={report.properties.id}>

              {/* Clickable report row — clicking a second time collapses the detail */}
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

              {/* Inline detail panel — expands below the selected report row */}
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

                  {/* Action buttons — only shown to signed-in users on active reports */}
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

        {/* Footer showing total active report count */}
        <div className="sidebar-footer">
          {reportCount} active report{reportCount !== 1 ? 's' : ''}
        </div>
      </div>

      {/* ── Map area ── */}
      <div className="map-wrapper">

        {/* Instruction banner overlay — pointer-events: none so it doesn't
            block map clicks. On mobile it wraps to two lines and shifts right
            to avoid overlapping the zoom buttons. */}
        <div className="map-banner">
          📍 Click anywhere on the map to report a condition
        </div>

        <MapContainer
          center={[44.5, -89.5]} // Centered on Wisconsin
          zoom={7}
          style={{ height: '100%', width: '100%' }}
        >
          {/* Esri World Imagery — satellite basemap, no API key required */}
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution='Tiles &copy; Esri'
          />

          {/* Esri reference layer — adds city names, roads, and borders
              on top of the satellite imagery to create a hybrid map */}
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
            attribution=""
            opacity={1}
          />

          {/* Map event listener — re-fetches reports on pan/zoom and
              handles click-to-place-pin interactions */}
          <MapEventHandler onMoveEnd={fetchReports} onMapClick={onMapClick} />

          {/* Temporary pin marker shown at the clicked location while
              the report form is open — disappears after submission */}
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

          {/* Report markers — one CircleMarker per active report.
              Color reflects severity. Selected reports are drawn larger
              with a white border to stand out from nearby markers. */}
          {reports.map(report => {
            const [lng, lat] = report.geometry.coordinates; // GeoJSON is [lng, lat], Leaflet wants [lat, lng]
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
                  // Clicking a marker selects it (or deselects if already selected)
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

        {/* ── Map legend ── */}
        {/* Positioned absolutely in the bottom-right corner of the map.
            Uses z-index 1000 to appear above the Leaflet tile layers. */}
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
        {/* Only visible on screens narrower than 768px (controlled by CSS).
            Replaces the desktop sidebar with a collapsible panel. */}
        <MobileBottomSheet reports={reports} onSelect={setSelectedReport} />
      </div>
    </>
  );
}
