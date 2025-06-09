import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom'; // Import Navigate
import HomePage from './pages/HomePage';       // You might keep this for other purposes or remove if not needed
import RosterDisplay from './pages/RosterDisplay';
import FreeAgentsPage from './pages/FreeAgentsPage';

const KAIOTY_LEAGUE_ID = "1200992049558454272";
const KAIOTY_ROSTER_ID = "9";                   

function App() {
  return (
    <Router>
      <Routes>
        <Route 
          path="/" 
          element={<Navigate replace to={`/league/${KAIOTY_LEAGUE_ID}/roster/${KAIOTY_ROSTER_ID}`} />} 
        />
        <Route path="/league/:leagueId/roster/:rosterId" element={<RosterDisplay />} />
        <Route path="/league/:leagueId/free-agents" element={<FreeAgentsPage />} />
        
      </Routes>
    </Router>
  );
}

export default App;