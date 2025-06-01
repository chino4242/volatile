// client/src/pages/HomePage.jsx
import React from 'react';
import { Link } from 'react-router-dom'; // Optional: for navigation

function HomePage() {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Welcome to Volatile Fantasy Football 📈!</h1>
      <p>
        {/* Example link to a roster - replace with actual IDs */}
        <Link to="/league/1200992049558454272/roster/9">View Example Roster (Kaioty, ID 9)</Link>
      </p>
      {/* Add other navigation or content here */}
    </div>
  );
}

export default HomePage;