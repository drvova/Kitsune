#!/bin/bash

# Sevalla-specific build helper script
# Optimizes the build process for Sevalla's Docker environment

set -e

echo "=== Sevalla Build Helper ==="
echo

# Function to check if we're running in Sevalla/Docker
is_sevalla_environment() {
    # Check for Docker container indicators
    if [ -f /.dockerenv ] || [ -f /.dockerinit ]; then
        return 0
    fi

    # Check for Sevalla-specific environment variables
    if [ -n "$SEVALLA" ] || [ -n "$SEVALLA_DEPLOYMENT" ]; then
        return 0
    fi

    # Check for container-like environment
    if [ -f /proc/1/cgroup ] && grep -q docker /proc/1/cgroup; then
        return 0
    fi

    return 1
}

# Function to optimize for Sevalla environment
optimize_for_sevalla() {
    echo "🚀 Optimizing for Sevalla environment..."

    # Set environment variables for Sevalla
    export NODE_ENV=production
    export NEXT_TELEMETRY_DISABLED=1
    export NODE_OPTIONS="--max-old-space-size=4096"
    export WEBPACK_VERBOSE=true

    # Additional Sevalla-specific optimizations
    export CI=true
    export NEXT_BUILD_WORKERS=1

    echo "✓ Environment variables set for Sevalla"
}

# Function to verify build prerequisites
verify_build_prerequisites() {
    echo "🔍 Verifying build prerequisites..."

    # Check Node.js version
    NODE_VERSION=$(node --version)
    echo "Node.js version: $NODE_VERSION"

    # Check npm version
    NPM_VERSION=$(npm --version)
    echo "npm version: $NPM_VERSION"

    # Check memory availability
    if command -v free &> /dev/null; then
        AVAILABLE_MEM=$(free -h | awk 'NR==2{printf "%.0f", $7}')
        echo "Available memory: ${AVAILABLE_MEM}MB"

        if [ "$AVAILABLE_MEM" -lt 2048 ]; then
            echo "⚠️  Warning: Low memory detected, build may fail"
        fi
    fi

    # Verify critical files exist
    CRITICAL_FILES=(
        "package.json"
        "next.config.mjs"
        "tsconfig.json"
        "src/app"
    )

    for file in "${CRITICAL_FILES[@]}"; do
        if [ -e "$file" ]; then
            echo "✓ $file exists"
        else
            echo "✗ $file missing - build will fail!"
            exit 1
        fi
    done

    echo "✓ All prerequisites verified"
}

# Function to run optimized build
run_optimized_build() {
    echo "🏗️  Running optimized build..."

    # Clean any previous build artifacts
    if [ -d ".next" ]; then
        echo "Cleaning previous build artifacts..."
        rm -rf .next
    fi

    # Run build with error handling
    echo "Starting Next.js build..."

    if npm run build; then
        echo "✅ Build successful!"

        # Verify build output
        if [ -d ".next" ] && [ -f ".next/BUILD_ID" ]; then
            echo "✓ Build output verified"
            echo "✓ BUILD_ID: $(cat .next/BUILD_ID)"
        else
            echo "⚠️  Build completed but output verification failed"
        fi
    else
        echo "❌ Build failed!"

        # Provide debugging information
        echo "🔍 Debugging information:"

        # Check disk space
        if command -v df &> /dev/null; then
            echo "Disk usage:"
            df -h .
        fi

        # Check for memory issues
        if [ -f "/var/log/dmesg" ] && grep -q "Out of memory" /var/log/dmesg; then
            echo "⚠️  Out of memory error detected in system logs"
        fi

        # Show npm error log if available
        if [ -f "npm-debug.log" ]; then
            echo "npm error log:"
            tail -20 npm-debug.log
        fi

        exit 1
    fi
}

# Main execution
main() {
    if is_sevalla_environment; then
        echo "🌐 Detected Sevalla/Docker environment"
        optimize_for_sevalla
    else
        echo "💻 Running in local environment"
    fi

    verify_build_prerequisites
    run_optimized_build

    echo "🎉 Build process completed successfully!"
}

# Run main function
main "$@"