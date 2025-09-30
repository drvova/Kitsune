#!/bin/bash

# Test script for Cloud Native Buildpacks with Next.js application
# This script tests different buildpack configurations to solve module resolution issues

set -e

echo "=== Cloud Native Buildpacks Test Script ==="
echo

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

# Function to check if pack CLI is installed
check_pack_cli() {
    if command -v pack &> /dev/null; then
        print_success "Pack CLI is installed"
        pack version
    else
        print_error "Pack CLI is not installed"
        echo "To install Pack CLI:"
        echo "Linux:"
        echo "curl -sSL \"https://github.com/buildpacks/pack/releases/latest/download/pack-v0.33.2-linux.tgz\" | tar -C /usr/local/bin/ -xzv pack"
        echo "macOS:"
        echo "curl -sSL \"https://github.com/buildpacks/pack/releases/latest/download/pack-v0.33.2-macos.tgz\" | tar -C /usr/local/bin/ -xzv pack"
        echo ""
        echo "Or visit: https://buildpacks.io/docs/for-platform-operators/how-to/integrate-ci/pack/"
        exit 1
    fi
}

# Function to test Paketo buildpacks
test_paketo_buildpacks() {
    print_status "Testing Paketo buildpacks..."

    local image_name="kitsune-paketo-test"

    # Clean up any existing test image
    if docker images | grep -q "$image_name"; then
        print_status "Removing existing test image..."
        docker rmi "$image_name" || true
    fi

    # Build with Paketo
    print_status "Building with Paketo builder:base..."
    if pack build "$image_name" \
        --path . \
        --builder paketobuildpacks/builder:base \
        --env NODE_ENV=production \
        --env NEXT_TELEMETRY_DISABLED=1; then
        print_success "Paketo build completed successfully"

        # Test the built image
        print_status "Testing Paketo-built image..."
        if docker run --rm -p 3000:3000 -e PORT=3000 "$image_name" &
        then
            local pid=$!
            sleep 5

            # Check if application is running
            if curl -s http://localhost:3000 > /dev/null; then
                print_success "Paketo-built application is running successfully"
                kill $pid
            else
                print_warning "Paketo-built application may not be fully functional"
                kill $pid 2>/dev/null || true
            fi
        fi

        # Show image details
        print_status "Paketo image details:"
        docker images | grep "$image_name"

        return 0
    else
        print_error "Paketo build failed"
        return 1
    fi
}

# Function to test Heroku buildpacks
test_heroku_buildpacks() {
    print_status "Testing Heroku buildpacks..."

    local image_name="kitsune-heroku-test"

    # Clean up any existing test image
    if docker images | grep -q "$image_name"; then
        print_status "Removing existing test image..."
        docker rmi "$image_name" || true
    fi

    # Build with Heroku
    print_status "Building with Heroku builder..."
    if pack build "$image_name" \
        --path . \
        --builder heroku/buildpacks:20 \
        --env NODE_ENV=production \
        --env NEXT_TELEMETRY_DISABLED=1 \
        --env NPM_CONFIG_PRODUCTION=false; then
        print_success "Heroku build completed successfully"

        # Test the built image
        print_status "Testing Heroku-built image..."
        if docker run --rm -p 3001:3000 -e PORT=3000 "$image_name" &
        then
            local pid=$!
            sleep 5

            # Check if application is running
            if curl -s http://localhost:3001 > /dev/null; then
                print_success "Heroku-built application is running successfully"
                kill $pid
            else
                print_warning "Heroku-built application may not be fully functional"
                kill $pid 2>/dev/null || true
            fi
        fi

        # Show image details
        print_status "Heroku image details:"
        docker images | grep "$image_name"

        return 0
    else
        print_error "Heroku build failed"
        return 1
    fi
}

# Function to compare build performance
compare_builds() {
    print_status "Comparing build performance..."

    echo ""
    echo "Build Performance Comparison:"
    echo "============================"

    # Docker build time
    print_status "Timing Docker build..."
    local docker_start=$(date +%s)
    if docker build -t kitsune-docker-comparison . > /dev/null 2>&1; then
        local docker_end=$(date +%s)
        local docker_time=$((docker_end - docker_start))
        print_success "Docker build completed in ${docker_time}s"
    else
        print_error "Docker build failed"
        local docker_time="FAILED"
    fi

    echo "Docker build: ${docker_time}s"

    # Paketo build time (if it succeeded)
    if docker images | grep -q "kitsune-paketo-test"; then
        print_status "Paketo build was successful (see above for timing)"
    fi

    # Heroku build time (if it succeeded)
    if docker images | grep -q "kitsune-heroku-test"; then
        print_status "Heroku build was successful (see above for timing)"
    fi
}

# Function to generate report
generate_report() {
    echo ""
    echo "=== Buildpack Test Report ==="
    echo ""
    echo "This script tested Cloud Native Buildpacks as an alternative to Docker"
    echo "for resolving the module resolution issues on Sevalla."
    echo ""
    echo "Next Steps:"
    echo "1. Review the build results above"
    echo "2. Test the successful buildpack images in your Sevalla environment"
    echo "3. Compare with your current Docker build performance"
    echo "4. Consider migrating to buildpacks if they solve the module resolution issues"
    echo ""
    echo "Configuration files created:"
    echo "- project.toml: Buildpack configuration"
    echo "- Procfile: Process definition"
    echo ""
    echo "If buildpacks work well, you can:"
    echo "1. Use buildpacks directly if Sevalla supports them"
    echo "2. Use buildpacks to create optimized Docker images"
    echo "3. Replace your Dockerfile entirely with buildpack-based images"
}

# Function to check Sevalla compatibility
check_sevalla_compatibility() {
    print_status "Checking Sevalla buildpack compatibility..."

    echo "Sevalla buildpack compatibility:"
    echo "================================="
    echo "1. Check Sevalla documentation for buildpack support"
    echo "2. If Sevalla supports buildpacks, you can deploy directly"
    echo "3. If not, use buildpacks to create optimized Docker images"
    echo "4. The generated images can be pushed to Sevalla's registry"
    echo ""
    echo "API Check:"
    echo "Review Sevalla API documentation for buildpack endpoints"
    echo "https://api-docs.sevalla.com/"
    echo ""
    echo "Deployment options:"
    echo "- Direct buildpack deployment (if supported)"
    echo "- Buildpack-to-Docker hybrid approach"
    echo "- Buildpack-generated Docker images"
}

# Main execution
main() {
    echo "Starting Cloud Native Buildpacks testing..."
    echo ""

    # Check prerequisites
    check_pack_cli

    echo ""

    # Test different buildpacks
    local paketo_success=false
    local heroku_success=false

    if test_paketo_buildpacks; then
        paketo_success=true
    fi

    echo ""

    if test_heroku_buildpacks; then
        heroku_success=true
    fi

    echo ""

    # Compare builds
    if command -v docker &> /dev/null; then
        compare_builds
    else
        print_warning "Docker not available for comparison"
    fi

    echo ""

    # Check Sevalla compatibility
    check_sevalla_compatibility

    echo ""

    # Generate final report
    generate_report

    # Summary
    echo ""
    if [ "$paketo_success" = true ] || [ "$heroku_success" = true ]; then
        print_success "Buildpack testing completed successfully!"
        echo ""
        echo "Successful builds:"
        [ "$paketo_success" = true ] && echo "✓ Paketo buildpacks"
        [ "$heroku_success" = true ] && echo "✓ Heroku buildpacks"
        echo ""
        echo "You can now test these images in your Sevalla environment."
    else
        print_error "All buildpack tests failed"
        echo ""
        echo "Troubleshooting:"
        echo "1. Check the error messages above"
        echo "2. Ensure your package.json is correct"
        echo "3. Verify Node.js compatibility"
        echo "4. Check network connectivity for buildpack downloads"
    fi
}

# Run main function
main "$@"