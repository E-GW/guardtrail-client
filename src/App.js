// App.js
// Root component of the GuardTrail application.
// Manages global state (auth, active filters, pending pin location)
// and renders the title bar, toolbar, map view, modals, and footer.

import React, { useState } from 'react';
import './index.css';
import MapView from './components/MapView';
import ReportForm from './components/ReportForm';
import AuthScreen from './components/Auth';
import hikersImg from './hikers.png';

// Filter options passed down to MapView for the filter chip buttons.
// null value means "show all" — no type filter applied to the API request.
const FILTER_OPTIONS = [
  { label: 'All', value: null },
  { label: 'Ice / Snow', value: 'ice_snow' },
  { label: 'Flooding', value: 'flooding' },
  { label: 'Blowdown', value: 'blowdown' },
  { label: 'Closure', value: 'closure' },
];

export default function App() {
  // Stores the signed-in user's email, role, and JWT token.
  // null when no user is signed in.
  const [user, setUser] = useState(null);

  // Controls modal visibility
  const [showAuth, setShowAuth] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);

  // Total number of active reports currently visible — displayed in the toolbar
  const [reportCount, setReportCount] = useState(0);

  // Active condition type filter — passed to MapView and then to the API
  const [filterType, setFilterType] = useState(null);

  // Incrementing key forces MapView to fully re-mount and re-fetch reports
  // after a new report is submitted, ensuring the map reflects the latest data
  const [refreshKey, setRefreshKey] = useState(0);

  // Coordinates of the pin the user placed by clicking the map.
  // Passed to ReportForm so the location field is pre-filled.
  const [pendingPin, setPendingPin] = useState(null);

  // Called by AuthScreen after successful sign-in.
  // Stores the user object and closes the auth modal.
  function handleLogin(userData) {
    setUser(userData);
    setShowAuth(false);
  }

  // Signs the user out by clearing the stored JWT token and resetting user state.
  // The next API request will be unauthenticated.
  function handleLogout() {
    localStorage.removeItem('guardtrail_token');
    setUser(null);
  }

  // Called by ReportForm after a successful submission.
  // Increments refreshKey to force MapView to re-fetch and display the new report.
  function handleReportSuccess() {
    setRefreshKey(k => k + 1);
    setPendingPin(null);
  }

  // Called when the user clicks on the map.
  // If signed in, opens the report form with the clicked coordinates pre-filled.
  // If not signed in, opens the auth modal instead.
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
      {/* Full-width dark blue bar at the top with the app name and hiker logo */}
      <div className="title-bar">
        GuardTrail
        <img
          src={hikersImg}
          alt="hikers"
          style={{
            height: 30,
            marginLeft: 12,
            verticalAlign: 'top',
            filter: 'invert(1)', // Inverts black image to white for the dark background
          }}
        />
      </div>

      {/* ── Toolbar row ── */}
      {/* Contains the sidebar label, info button, role badge, and auth/report actions */}
      <div className="toolbar-row">
        <div className="toolbar-sidebar-label">Trail Reports</div>

        {/* Info button — toggles a dropdown with app description */}
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

          {/* Info dropdown — absolutely positioned below the button */}
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
              <b>GuardTrail</b> gives hikers the ability to track and report adverse trail
              conditions like ice, washouts, and downed trees in real time, giving later
              hikers a heads-up about what they may encounter. <br /><br />
              Trail maintenance crews can also use the app to see where hikers have found
              problems and resolve them.
            </div>
          )}
        </div>

        {/* Right side of toolbar: role badge and auth/report buttons */}
        <div className="toolbar-map-actions">

          {/* Role badge — shows Hiker or Land Manager depending on Cognito custom:role */}
          {user && (
            <span className={`role-badge ${user.role === 'land_manager' ? 'manager' : ''}`}>
              {user.role === 'land_manager' ? '🌲 Land Manager' : '🥾 Hiker'}
            </span>
          )}

          {/* Authenticated users see Report Condition and Sign out buttons.
              Unauthenticated users see only Sign in to report. */}
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

      {/* ── Main content area ── */}
      {/* Contains the sidebar and map — grows to fill remaining vertical space */}
      <div className="main-content">
        <MapView
          key={refreshKey}          // Re-mounts MapView after report submission
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

      {/* ── Auth modal ── */}
      {showAuth && <AuthScreen onLogin={handleLogin} />}

      {/* ── Report form modal ── */}
      {/* Passes pendingPin coordinates so the location field is pre-filled
          when the user clicked the map before opening the form */}
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
