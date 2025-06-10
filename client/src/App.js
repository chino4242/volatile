// client/src/App.js

import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import RosterDisplay from './pages/RosterDisplay';
import FreeAgentsPage from './pages/FreeAgentsPage';

// Define a default league ID for the root redirect
const DEFAULT_LEAGUE_ID = "1200992049558454272";

function App() {
  return (
    <Router>
      <Routes>
        {/* Redirect the root path "/" to a default league's homepage */}
        <Route 
          path="/" 
          element={<Navigate replace to={`/league/${DEFAULT_LEAGUE_ID}`} />} 
        />

        {/* This route will show the list of managers for a given league */}
        <Route path="/league/:leagueId" element={<HomePage />} />
        
        {/* This route displays a specific roster's details */}
        <Route path="/league/:leagueId/roster/:rosterId" element={<RosterDisplay />} />
        
        {/* This route displays the free agents for a given league */}
        <Route path="/league/:leagueId/free-agents" element={<FreeAgentsPage />} />

      <Route path="*" element={<h2>Page Not Found</h2>} />
      </Routes>
    </Router>
  );
}

export default App;
