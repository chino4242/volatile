// client/src/App.js

import React from 'react';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import HomePage from './pages/HomePage';
import RosterDisplay from './pages/RosterDisplay';
import FreeAgentsPage from './pages/FreeAgentsPage';
import FleaflickerFreeAgentsPage from './pages/FleaflickerFreeAgentsPage'; // Import the new component

// A simple landing page component to choose the platform
function LandingPage() {
  return (
    <div style={{ padding: '40px', fontFamily: 'Arial, sans-serif', textAlign: 'center' }}>
      <h1>Fantasy Football League Analyzer</h1>
      <p>Choose your platform and enter a league ID to get started.</p>
      <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'center', gap: '40px' }}>
        <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
          <h2>Sleeper</h2>
          <p>Example League ID: 1200992049558454272</p>
          <Link to="/league/1200992049558454272" style={styles.button}>
            Go to Sleeper Example
          </Link>
        </div>
        <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
          <h2>Fleaflicker</h2>
          <p>Example League ID: 197269</p>
          <Link to="/fleaflicker/197269/free-agents" style={styles.button}>
            Go to Fleaflicker Example
          </Link>
        </div>
      </div>
    </div>
  );
}

const styles = {
    button: {
        display: 'inline-block',
        padding: '10px 20px',
        backgroundColor: '#007bff',
        color: 'white',
        textDecoration: 'none',
        borderRadius: '5px',
        fontWeight: 'bold'
    }
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />

        {/* --- SLEEPER ROUTES --- */}
        <Route path="/league/:leagueId" element={<HomePage />} />
        <Route path="/league/:leagueId/roster/:rosterId" element={<RosterDisplay />} />
        <Route path="/league/:leagueId/free-agents" element={<FreeAgentsPage />} />
        
        {/* --- NEW: FLEAFICKER ROUTE --- */}
        <Route path="/fleaflicker/:leagueId/free-agents" element={<FleaflickerFreeAgentsPage />} />

        {/* Catch-all for any other routes */}
        <Route path="*" element={
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <h2>Page Not Found</h2>
            <Link to="/">Go to Home</Link>
          </div>
        } />
      </Routes>
    </Router>
  );
}

export default App;
