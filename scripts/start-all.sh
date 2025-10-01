#!/bin/bash

# Production startup script for Next.js + Proxy concurrent execution
# This script handles graceful startup and shutdown of both services

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if port is available and kill conflicting processes
check_port() {
    local port=$1
    local service=$2

    # Check if port is in use
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        print_warning "Port $port is already in use (needed for $service)"

        # Find and kill processes using the port
        local pids=$(lsof -ti :$port 2>/dev/null || true)
        if [ -n "$pids" ]; then
            print_status "Attempting to free port $port by killing processes..."
            echo "$pids" | xargs kill -TERM 2>/dev/null || true

            # Wait a moment for processes to terminate
            sleep 2

            # Force kill if still running
            pids=$(lsof -ti :$port 2>/dev/null || true)
            if [ -n "$pids" ]; then
                print_warning "Force killing remaining processes on port $port..."
                echo "$pids" | xargs kill -KILL 2>/dev/null || true
                sleep 1
            fi

            # Final check
            if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
                print_error "Failed to free port $port"
                return 1
            else
                print_success "Port $port is now available"
            fi
        else
            print_error "Port $port is in use but couldn't identify process"
            return 1
        fi
    fi
    return 0
}

# Function to wait for service to be ready
wait_for_service() {
    local url=$1
    local service=$2
    local max_attempts=30
    local attempt=1

    print_status "Waiting for $service to be ready..."

    while [ $attempt -le $max_attempts ]; do
        if curl -s -f "$url" > /dev/null 2>&1; then
            print_success "$service is ready!"
            return 0
        fi

        print_status "Attempt $attempt/$max_attempts: $service not ready yet..."
        sleep 2
        ((attempt++))
    done

    print_error "$service failed to start within $max_attempts attempts"
    return 1
}

# Function to handle graceful shutdown
graceful_shutdown() {
    print_status "Received shutdown signal, stopping services gracefully..."

    # Kill all child processes
    if [ -n "$NEXT_PID" ]; then
        print_status "Stopping Next.js server (PID: $NEXT_PID)..."
        kill -TERM $NEXT_PID 2>/dev/null || true
    fi

    if [ -n "$PROXY_PID" ]; then
        print_status "Stopping proxy server (PID: $PROXY_PID)..."
        kill -TERM $PROXY_PID 2>/dev/null || true
    fi

    # Wait for processes to exit
    sleep 5

    # Force kill if still running
    if [ -n "$NEXT_PID" ] && kill -0 $NEXT_PID 2>/dev/null; then
        print_warning "Force killing Next.js server..."
        kill -KILL $NEXT_PID 2>/dev/null || true
    fi

    if [ -n "$PROXY_PID" ] && kill -0 $PROXY_PID 2>/dev/null; then
        print_warning "Force killing proxy server..."
        kill -KILL $PROXY_PID 2>/dev/null || true
    fi

    print_success "All services stopped"
    exit 0
}

# Function to start services
start_services() {
    print_status "Starting Kitsune application with proxy..."

    # Check and free required ports
    if ! check_port 3001 "Next.js"; then
        print_error "Cannot start Next.js - port 3001 unavailable"
        exit 1
    fi

    if ! check_port 3000 "Proxy server"; then
        print_error "Cannot start proxy server - port 3000 unavailable"
        exit 1
    fi

    # Set environment variables
    export NODE_ENV=production
    export NEXT_TELEMETRY_DISABLED=1
    export PORT=3001  # Next.js will use this port
    export NEXTJS_URL=http://localhost:3001  # Proxy will forward to this URL

    print_status "Environment: $NODE_ENV"
    print_status "Next.js internal port: 3001"
    print_status "Proxy public port: 3000"

    # Start Next.js server (using standalone build)
    print_status "Starting Next.js standalone server..."
    if [ -f ".next/standalone/server.js" ]; then
        node .next/standalone/server.js &
        NEXT_PID=$!
    else
        print_status "Standalone server not found, using next start..."
        npm start &
        NEXT_PID=$!
    fi

    # Start proxy server with fallback logic
    print_status "Starting proxy server..."
    cd proxy-m3u8

    # Try different binary options in order of preference
    if [ -f "proxy-server-linux" ]; then
        print_status "Using Linux pre-built binary..."
        PORT=3000 NEXTJS_URL=$NEXTJS_URL ./proxy-server-linux &
        PROXY_PID=$!
    elif [ -f "proxy-server" ]; then
        print_status "Using pre-built binary..."
        PORT=3000 NEXTJS_URL=$NEXTJS_URL ./proxy-server &
        PROXY_PID=$!
    elif command -v go &> /dev/null; then
        print_status "Building proxy from source..."
        go build -o proxy-server cmd/main.go && PORT=3000 NEXTJS_URL=$NEXTJS_URL ./proxy-server &
        PROXY_PID=$!
    else
        print_error "No proxy binary available and Go runtime not found."
        cd ..
        kill $NEXT_PID 2>/dev/null || true
        exit 1
    fi

    cd ..

    print_status "Services started:"
    print_status "  - Next.js server (PID: $NEXT_PID) on http://localhost:3001 (internal)"
    print_status "  - Proxy server (PID: $PROXY_PID) on http://localhost:3000 (public)"

    # Wait for services to be ready
    wait_for_service "http://localhost:3001/api/health" "Next.js"
    wait_for_service "http://localhost:3000/health" "Proxy server"

    print_success "All services are running successfully!"
    echo ""
    print_status "Application URLs:"
    print_status "  - Public access:    http://localhost:3000"
    print_status "  - Proxy health:     http://localhost:3000/health"
    print_status "  - Next.js (internal): http://localhost:3001"
    echo ""
    print_status "Press Ctrl+C to stop all services"

    # Wait for services
    wait $NEXT_PID $PROXY_PID
}

# Main execution
main() {
    print_status "Kitsune Production Startup Script"
    echo "========================================"

    # Set up signal handlers for graceful shutdown
    trap graceful_shutdown SIGTERM SIGINT SIGQUIT

    # Check if we're in the right directory
    if [ ! -f "package.json" ]; then
        print_error "package.json not found. Please run this script from the project root."
        exit 1
    fi

    # Check if Node.js modules are installed
    if [ ! -d "node_modules" ]; then
        print_error "node_modules not found. Please run 'npm install' first."
        exit 1
    fi

    # Check if concurrently is available
    if ! command -v concurrently &> /dev/null; then
        print_error "concurrently is not installed. Please run 'npm install'."
        exit 1
    fi

    # Check if Go is available and proxy binary exists
    if ! command -v go &> /dev/null; then
        print_warning "Go runtime not found, will use pre-built binary."
        if [ ! -f "proxy-m3u8/proxy-server" ] && [ ! -f "proxy-m3u8/proxy-server-linux" ]; then
            print_error "Neither Go runtime nor pre-built proxy binary found. Proxy server cannot start."
            print_status "Please ensure Go is installed or include a pre-built proxy binary."
            exit 1
        fi
    fi

    start_services
}

# Run main function
main "$@"