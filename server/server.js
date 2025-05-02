const express = require('express'); // Import Express Framework
const cors = require('cors'); //Import CORS middleware (install later)

const app = express(); //Create an Express application instance
const PORT = process.env.PORT | 5000; // Define port: user render's env var or 5000 locally

//Middleware

app.use(cors()); //Enable CORS for all origins (for local development)
app.use(express.json()); //Middleware to parse JSON bodies

//Simple API route
app.get('/api/hello', (req, res) => {
    res.json({ message: 'Hello from Backend!' }); // Send JSON response
});

//Start the server
app.listen(PORT, () => {
    console.log(`Server is running on ${PORT}`);
});

