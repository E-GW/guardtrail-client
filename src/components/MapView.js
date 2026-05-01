import React, { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { getReports } from '../api';
import ReportDetail from './ReportDetail';
import ReportForm from './ReportForm';

const SEVERITY_COLORS = {
  high: '#c94040',
  moderate: '#bf7520',
  low: '#2060a8',
};

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

export default function MapView({ user, onReportsLoaded, filterStatus, filterType }) {
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pendingPin, setPendingPin] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = { status: filterStatus || 'active' };
      if (filterType) params.type = filterType;
      const res = await getReports(params);
      setReports(res.data.features || []);
      if (onReportsLoaded) onReportsLoaded(res.data.features || []);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterType, onReportsLoaded]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  return (
    <div className="main-content">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          Trail reports {loading && <span style={{ fontSize: 11, color: '#888' }}>Loading...</span>}
        </div>
        <div className="report-list">
          {reports.length === 0 && !loading && (
            <div style={{ padding: 14, color: '#888', fontSize: 13 }}>No reports in this area.</div>
          )}
          {reports.map(report => (
            <div key={report.properties.id} className="report-item"
              onClick={() => setSelectedReport(report)}>
              <div className="report-item-title">{report.properties.trail_name}</div>
              <div className="report-item-meta">
                {report.properties.condition_type.replace('_', ' ')} ·{' '}
                <span style={{ color: SEVERITY_COLORS[report.properties.severity] }}>
                  {report.properties.severity}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Map */}
      <div className="map-wrapper">
        <div style={{
          position: 'absolute',
          top: 12,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(31,78,121,0.9)',
          color: '#fff',
          padding: '7px 16px',
          borderRadius: 20,
          fontSize: 13,
          zIndex: 1000,
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
        }}>
          📍 Click anywhere on the map to report a condition
        </div>
        <MapContainer
          center={[44.5, -89.5]}
          zoom={7}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
          />
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
            attribution=""
            opacity={1}
          />
          <MapEventHandler
            onMoveEnd={fetchReports}
            onMapClick={(lat, lng) => {
              setPendingPin({ lat, lng });
              setShowForm(true);
            }}
          />
          {pendingPin && (
            <Marker
              position={[pendingPin.lat, pendingPin.lng]}
              icon={L.divIcon({
                className: '',
                html: `<div style="
                  width: 20px;
                  height: 20px;
                  background: #1f4e79;
                  border: 3px solid #fff;
                  border-radius: 50%;
                  box-shadow: 0 2px 6px rgba(0,0,0,0.4);
                "></div>`,
                iconAnchor: [10, 10],
              })}
            />
          )}
          {reports.map(report => {
            const [lng, lat] = report.geometry.coordinates;
            const color = SEVERITY_COLORS[report.properties.severity] || '#888';
            return (
              <CircleMarker
                key={report.properties.id}
                center={[lat, lng]}
                radius={10}
                pathOptions={{ color, fillColor: color, fillOpacity: 0.8 }}
                eventHandlers={{ click: () => setSelectedReport(report) }}
              >
                <Popup>{report.properties.trail_name}</Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>

      {/* Detail panel */}
      {selectedReport && (
        <ReportDetail
          report={selectedReport}
          user={user}
          onClose={() => setSelectedReport(null)}
          onRefresh={fetchReports}
        />
      )}

      {/* Mobile bottom sheet */}
      {reports.length > 0 && (
        <div className="mobile-bottom-sheet">
          <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 13 }}>
            {reports.length} active report{reports.length !== 1 ? 's' : ''}
          </div>
          {reports.slice(0, 3).map(report => (
            <div key={report.properties.id} className="report-item"
              onClick={() => setSelectedReport(report)}>
              <div className="report-item-title">{report.properties.trail_name}</div>
              <div className="report-item-meta">
                {report.properties.condition_type.replace('_', ' ')} · {report.properties.severity}
              </div>
            </div>
          ))}
        </div>
      )}
      {showForm && pendingPin && (
        <ReportForm
          onClose={() => {
            setShowForm(false);
            setPendingPin(null);
          }}
          onSuccess={() => {
            setShowForm(false);
            setPendingPin(null);
            fetchReports();
          }}
          defaultLat={pendingPin.lat.toFixed(6)}
          defaultLng={pendingPin.lng.toFixed(6)}
        />
      )}
    </div>
  );
}
