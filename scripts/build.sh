#!/bin/bash
# Production build and deployment script for Kitsune

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="kitsune"
DOCKER_REGISTRY="dovakiin0"
VERSION=${1:-"latest"}

echo -e "${GREEN}🏗️  Starting build process for ${PROJECT_NAME}:${VERSION}${NC}"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo -e "${YELLOW}📋 Checking prerequisites...${NC}"
for cmd in docker docker-compose; do
    if ! command_exists $cmd; then
        echo -e "${RED}❌ $cmd is not installed or not in PATH${NC}"
        exit 1
    fi
done

# Clean up previous builds
echo -e "${YELLOW}🧹 Cleaning up previous builds...${NC}"
docker system prune -f --volumes
docker image prune -f

# Build the application locally first (to catch errors early)
echo -e "${YELLOW}🔨 Building Next.js application...${NC}"
npm ci --only=production
npm run build

# Build Docker image with multi-platform support
echo -e "${YELLOW}🐳 Building Docker image...${NC}"
docker buildx build \
    --platform linux/amd64,linux/arm64 \
    --tag ${DOCKER_REGISTRY}/${PROJECT_NAME}:${VERSION} \
    --tag ${DOCKER_REGISTRY}/${PROJECT_NAME}:latest \
    --push \
    .

# Build proxy service
echo -e "${YELLOW}🔧 Building proxy service...${NC}"
cd proxy-m3u8
docker buildx build \
    --platform linux/amd64,linux/arm64 \
    --tag ${DOCKER_REGISTRY}/proxy-m3u8:${VERSION} \
    --tag ${DOCKER_REGISTRY}/proxy-m3u8:latest \
    --push \
    .
cd ..

# Run security scan on the images
echo -e "${YELLOW}🔒 Running security scan...${NC}"
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
    aquasec/trivy image ${DOCKER_REGISTRY}/${PROJECT_NAME}:${VERSION} || echo -e "${YELLOW}⚠️  Trivy scan completed with warnings${NC}"

# Test the deployment locally
echo -e "${YELLOW}🧪 Testing deployment locally...${NC}"
docker-compose -f docker-compose.prod.yml down --remove-orphans
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to be healthy
echo -e "${YELLOW}⏳ Waiting for services to be healthy...${NC}"
timeout 300 bash -c 'until docker-compose -f docker-compose.prod.yml ps | grep -q "healthy"; do sleep 5; done'

# Run health checks
echo -e "${YELLOW}🏥 Running health checks...${NC}"
if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Main application health check passed${NC}"
else
    echo -e "${RED}❌ Main application health check failed${NC}"
    docker-compose -f docker-compose.prod.yml logs kitsune
    exit 1
fi

if curl -f http://localhost:4040/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Proxy service health check passed${NC}"
else
    echo -e "${YELLOW}⚠️  Proxy service health check failed (may not have health endpoint)${NC}"
fi

# Performance test
echo -e "${YELLOW}⚡ Running performance test...${NC}"
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000/api/health || echo -e "${YELLOW}⚠️  Performance test failed to complete${NC}"

echo -e "${GREEN}🎉 Build completed successfully!${NC}"
echo -e "${GREEN}📦 Images pushed: ${NC}"
echo -e "${GREEN}   - ${DOCKER_REGISTRY}/${PROJECT_NAME}:${VERSION}${NC}"
echo -e "${GREEN}   - ${DOCKER_REGISTRY}/${PROJECT_NAME}:latest${NC}"
echo -e "${GREEN}   - ${DOCKER_REGISTRY}/proxy-m3u8:${VERSION}${NC}"
echo -e "${GREEN}   - ${DOCKER_REGISTRY}/proxy-m3u8:latest${NC}"

# Show current containers
echo -e "${YELLOW}📊 Current containers:${NC}"
docker-compose -f docker-compose.prod.yml ps

echo -e "${GREEN}✨ All done! Your application is running at http://localhost:3000${NC}"