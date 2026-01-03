#!/bin/bash

# Millo Server Startup Script
# This script starts the Millo e-commerce platform server

echo "🚀 Starting Millo E-Commerce Server..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

# Create uploads directory if it doesn't exist
if [ ! -d "uploads" ]; then
    echo "📁 Creating uploads directory..."
    mkdir -p uploads
    touch uploads/.gitkeep
    echo ""
fi

# Display server information
echo "✨ Starting server..."
echo "📍 Location: $(pwd)"
echo "🌐 Server will be available at: http://localhost:3000"
echo "📊 Dashboard: http://localhost:3000/dashboard.html"
echo "🏪 Storefront: http://localhost:3000/index.html"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""
echo "----------------------------------------"
echo ""

# Start the server
node server.js
