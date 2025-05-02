import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [message, setMessage] = useState(''); //State to hold backend message

  useEffect(() => {
    //Fetch data from backend API when component mounts
    fetch(`${process.env.REACT_APP_API_URL}/api/hello`).then(response => response.json()).then(data => {
      setMessage(data.message);
    }).catch(error=> console.error('Error fetching data:', error));
  },);

  return (
    <div className = "App">
      <header className ="App-header">
        <h1>Hello Mala: from Volatile Creative (AKA Papo)</h1>
        <p>Message from backend: {message || 'Loading...'}</p>
      </header>
    </div>
  );
}
export default App;