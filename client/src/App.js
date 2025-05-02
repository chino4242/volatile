import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [message, setMessage] = useState(''); //State to hold backend message

  useEffect(() => {
    //Fetch data from backend API when component mounts
    fetch('http://localhost:5000/api/hello').then(response => response.json()).then(data => {
      setMessage(data.message);
    }).catch(error=> console.error('Error fetching data:', error));
  },);

  return (
    <div className = "App">
      <header className ="App-header">
        <h1>Hello World from Volatile Creative.</h1>
        <p>Message from backend: {message || 'Loading...'}</p>
      </header>
    </div>
  );
}
export default App;