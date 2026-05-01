import React, { useState } from 'react';
import './index.css';
import MapView from './components/MapView';
import ReportForm from './components/ReportForm';
import AuthScreen from './components/Auth';

const FILTER_OPTIONS = [
  { label: 'All', value: null },
  { label: 'Ice / Snow', value: 'ice_snow' },
  { label: 'Flooding', value: 'flooding' },
  { label: 'Blowdown', value: 'blowdown' },
  { label: 'Closure', value: 'closure' },
];

export default function App() {
  const [user, setUser] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportCount, setReportCount] = useState(0);
  const [filterType, setFilterType] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  function handleLogin(userData) {
    setUser(userData);
    setShowAuth(false);
  }

  function handleLogout() {
    localStorage.removeItem('guardtrail_token');
    setUser(null);
  }

  function handleReportSuccess() {
    setRefreshKey(k => k + 1);
  }

  return (
    <div className="app-wrapper">
      {/* Nav bar */}
      <nav className="navbar">
        <div className="navbar-logo">🗺 GuardTrail</div>
        <div className="navbar-actions">
          {user && (
            <span className={`role-badge ${user.role === 'land_manager' ? 'manager' : ''}`}>
              {user.role === 'land_manager' ? '🌲 Land Manager' : '🥾 Hiker'}
            </span>
          )}
          {user ? (
            <>
              <button className="btn btn-primary"
                onClick={() => setShowReportForm(true)}>
                + Report condition
              </button>
              <button className="btn" onClick={handleLogout}>Sign out</button>
            </>
          ) : (
            <button className="btn btn-primary" onClick={() => setShowAuth(true)}>
              Sign in to report
            </button>
          )}
        </div>
      </nav>

      {/* Filter chips */}
      <div style={{ display: 'flex', gap: 8, padding: '8px 14px', background: '#fff', borderBottom: '1px solid #e0e0e0', flexWrap: 'wrap' }}>
        {FILTER_OPTIONS.map(opt => (
          <button key={opt.label}
            className={`chip ${filterType === opt.value ? 'active' : ''}`}
            onClick={() => setFilterType(opt.value)}>
            {opt.label}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: '#888', alignSelf: 'center' }}>
          {reportCount} active report{reportCount !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Map */}
      <MapView
        key={refreshKey}
        user={user}
        onReportsLoaded={features => setReportCount(features.length)}
        filterType={filterType}
      />

      {/* Mobile FAB */}
      <button className="mobile-fab" onClick={() => user ? setShowReportForm(true) : setShowAuth(true)}>
        +
      </button>

      {/* Modals */}
      {showAuth && (
        <AuthScreen onLogin={handleLogin} />
      )}

      {showReportForm && (
        <ReportForm
          onClose={() => setShowReportForm(false)}
          onSuccess={handleReportSuccess}
        />
      )}
    </div>
  );
}
