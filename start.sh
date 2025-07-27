#!/bin/bash

# Start the Smart Wedding Photo Album application

echo "Starting Smart Wedding Photo Album..."

# Create necessary directories
mkdir -p uploads/thumbnails database

# Start backend in background
echo "Starting backend server..."
cd backend
python app.py &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Start frontend
echo "Starting frontend server..."
cd ../frontend
REACT_APP_API_URL=https://work-2-nbzjicskggkwmgic.prod-runtime.all-hands.dev/api npm start &
FRONTEND_PID=$!

echo "Application started!"
echo "Backend running on: https://work-2-nbzjicskggkwmgic.prod-runtime.all-hands.dev"
echo "Frontend running on: https://work-1-nbzjicskggkwmgic.prod-runtime.all-hands.dev"
echo ""
echo "Press Ctrl+C to stop both servers"

# Function to cleanup on exit
cleanup() {
    echo "Stopping servers..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

# Wait for both processes
wait