// client/src/App.js
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import HomePage from './pages/HomePage'; // Import your HomePage component
import RosterDisplay from './pages/RosterDisplay';
// import './App.css'; // Or your main CSS

function App() {
  return (
    <Router>
      {/* You could have a Navbar or other shared layout components here, outside <Routes> */}
      {/* For example: <Navbar /> */}
      <Routes>
        {/* This is the new route for the homepage */}
        <Route path="/" element={<HomePage />} />

        {/* Your existing route for roster display */}
        <Route path="/league/:leagueId/roster/:rosterId" element={<RosterDisplay />} />

        {/* Optional: Add a "catch-all" route for 404 Not Found pages */}
        {/* <Route path="*" element={<div><h2>Page Not Found</h2><Link to="/">Go Home</Link></div>} /> */}
      </Routes>
    </Router>
  );
}

export default App;