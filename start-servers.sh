#!/bin/bash

echo "Starting all servers..."

# Start Node.js server
(cd server && npm start) &
NODE_PID=$!

# Start Python server
(cd python_analysis && python3 api_server.py) &
PYTHON_PID=$!

# Start React client
(cd client && npm start) &
REACT_PID=$!

echo "All servers started!"
echo "Node.js server (PID: $NODE_PID)"
echo "Python server (PID: $PYTHON_PID)"
echo "React client (PID: $REACT_PID)"
echo ""
echo "Press Ctrl+C to stop all servers"

# Trap Ctrl+C and kill all processes
trap "echo 'Stopping all servers...'; kill $NODE_PID $PYTHON_PID $REACT_PID 2>/dev/null; exit" INT

# Wait for all background processes
wait
