// client/src/App.js

import React from 'react';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import HomePage from './pages/HomePage';
import GenericRosterDisplay from './components/GenericRosterDisplay';

import AdminPage from './pages/AdminPage';
import FreeAgentsPage from './pages/FreeAgentsPage';
import FleaflickerFreeAgentsPage from './pages/FleaflickerFreeAgentsPage';
import FleaflickerHomePage from './pages/FleaflickerHomePage';
import { styles } from './styles';

// A simple landing page component to choose the platform
function LandingPage() {
  return (
    <div style={styles.pageContainer}>
      <div style={{ textAlign: 'center', margin: '40px 0' }}>
        <h1 style={styles.h1}>Fantasy Football League Analyzer</h1>
        <p style={styles.p}>Choose your platform and enter a league ID to get started.</p>
      </div>
      <div style={{ marginTop: '30px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '40px' }}>
        <div style={styles.landingCard}>
          <h2 style={styles.h2}>Sleeper</h2>
          <p style={styles.p}>Example League ID: 1200992049558454272</p>
          <Link to="/league/1200992049558454272" style={styles.button}>
            Go to Sleeper Example
          </Link>
        </div>
        <div style={styles.landingCard}>
          <h2 style={styles.h2}>Fleaflicker</h2>
          <p style={styles.p}>Example League ID: 197269</p>
          <Link to="/fleaflicker/197269" style={styles.button}>
            Go to Fleaflicker Example
          </Link>
        </div>

        <div style={{ marginTop: '20px' }}>
          <Link to="/admin" style={{ color: '#aaa', textDecoration: 'none', borderBottom: '1px dashed #555' }}>
            Admin Dashboard (Update Rankings)
          </Link>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <div style={styles.appContainer}>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/admin" element={<AdminPage />} />
          {/* Sleeper Routes */}
          <Route path="/league/:leagueId" element={<HomePage />} />
          <Route path="/league/:leagueId/roster/:rosterId" element={<GenericRosterDisplay platform="sleeper" />} />
          <Route path="/league/:leagueId/free-agents" element={<FreeAgentsPage />} />
          {/* Fleaflicker Routes */}
          <Route path="/fleaflicker/:leagueId" element={<FleaflickerHomePage />} />
          <Route path="/fleaflicker/:leagueId/free-agents" element={<FleaflickerFreeAgentsPage />} />
          <Route path="/fleaflicker/:leagueId/roster/:rosterId" element={<GenericRosterDisplay platform="fleaflicker" />} />
          {/* Not Found Route */}
          {/* Not Found Route */}
          <Route path="*" element={
            <div style={styles.pageContainer}>
              <h2 style={styles.h2}>Page Not Found</h2>
              <Link to="/" style={styles.link}>Go to Home</Link>
            </div>
          } />
        </Routes>
      </Router>
    </div>
  );
}

export default App;
