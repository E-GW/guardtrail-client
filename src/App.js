import React, { useState } from 'react';
import './index.css';
import MapView from './components/MapView';
import ReportForm from './components/ReportForm';
import AuthScreen from './components/Auth';
import hikersImg from './hikers.png';

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
  const [showInfo, setShowInfo] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportCount, setReportCount] = useState(0);
  const [filterType, setFilterType] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [pendingPin, setPendingPin] = useState(null);

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
    setPendingPin(null);
  }

  function handleMapClick(lat, lng) {
    if (user) {
      setPendingPin({ lat, lng });
      setShowReportForm(true);
    } else {
      setShowAuth(true);
    }
  }

  return (
    <div className="app-wrapper">

      {/* ── Title bar ── */}
      <div className="title-bar">
        GuardTrail 
        <img
          src={hikersImg}
          alt="hikers"
          style={{
            height: 30,
            marginLeft: 12,
            verticalAlign: 'top',
            filter: 'invert(1)',
          }}
        />
      </div>

      {/* ── Toolbar row ── */}
      <div className="toolbar-row">
        <div className="toolbar-sidebar-label">Trail Reports</div>

        {/* Info button */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowInfo(!showInfo)}
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              border: '2px solid #1f4e79',
              background: showInfo ? '#1f4e79' : '#fff',
              color: showInfo ? '#fff' : '#1f4e79',
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              marginLeft: 10,
            }}
          >
            i
          </button>

          {/* Info dropdown */}
          {showInfo && (
            <div style={{
              position: 'absolute',
              top: 36,
              left: 0,
              background: '#fff',
              border: '1px solid #e0e0e0',
              borderRadius: 8,
              padding: 14,
              width: 280,
              boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
              zIndex: 2000,
              fontSize: 13,
              color: '#444',
              lineHeight: 1.6,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontWeight: 600, color: '#1f4e79' }}>About GuardTrail</span>
                <button
                  onClick={() => setShowInfo(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#888' }}
                >
                  ✕
                </button>
              </div>
              <b>GuardTrail</b> gives hikers the abilty to track and report adverse trail condition like ice, washouts, and downed trees in real time, giving later hikers a heads-up about what they may encounter. <br></br><br></br>Trail maintenance crews can also use the app to see where hikers have found problems and resolve them.
            </div>
          )}
        </div>

        <div className="toolbar-map-actions">
          {user && (
            <span className={`role-badge ${user.role === 'land_manager' ? 'manager' : ''}`}>
              {user.role === 'land_manager' ? '🌲 Land Manager' : '🥾 Hiker'}
            </span>
          )}
          {user ? (
            <>
              <button className="btn btn-primary btn-sm"
                onClick={() => setShowReportForm(true)}>
                + Report Condition
              </button>
              <button className="btn btn-sm" onClick={handleLogout}>
                Sign out
              </button> 
            </>
          ) : (
            <button className="btn btn-primary btn-sm"
              onClick={() => setShowAuth(true)}>
              Sign in to report
            </button>
          )}
        </div> 
      </div>

      {/* ── Main content ── */}
      <div className="main-content">
        <MapView
          key={refreshKey}
          user={user}
          onReportsLoaded={features => setReportCount(features.length)}
          filterType={filterType}
          filterOptions={FILTER_OPTIONS}
          onFilterChange={setFilterType}
          reportCount={reportCount}
          onMapClick={handleMapClick}
          pendingPin={pendingPin}
          onShowReportForm={() => setShowReportForm(true)}
        />
      </div>

      {/* ── Modals ── */}
      {showAuth && <AuthScreen onLogin={handleLogin} />}

      {showReportForm && (
        <ReportForm
          onClose={() => {
            setShowReportForm(false);
            setPendingPin(null);
          }}
          onSuccess={handleReportSuccess}
          defaultLat={pendingPin?.lat}
          defaultLng={pendingPin?.lng}
        />
      )}

      {/* ── Footer ── */}
      <div style={{
        background: '#ffffff',
        color: 'rgba(28, 28, 28, 0.7)',
        textAlign: 'center',
        fontSize: 11,
        padding: '4px 0',
        flexShrink: 0,
        letterSpacing: '0.04em',
      }}>
        Created by Elijah Gardner Woods, 2026
      </div>
      
    </div>
  );
}
