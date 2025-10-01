#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Default values
PORT=${PORT:-3000}
ENABLE_STREAMING_METRICS=${ENABLE_STREAMING_METRICS:-false}
REDPANDA_BROKERS=${REDPANDA_BROKERS:-localhost:9092}
REDPANDA_TOPIC=${REDPANDA_TOPIC:-proxy-metrics}

echo -e "${GREEN}Starting Proxy M3U8 Server...${NC}"

# Check if Redpanda is needed
if [ "$ENABLE_STREAMING_METRICS" = "true" ]; then
    echo -e "${YELLOW}Redpanda streaming metrics enabled${NC}"

    # Check if Redpanda is running
    if ! pgrep -x "redpanda" > /dev/null; then
        echo -e "${YELLOW}Starting Redpanda...${NC}"

        # Try to start Redpanda (different methods)
        if command -v systemctl &> /dev/null; then
            sudo systemctl start redpanda 2>/dev/null || echo -e "${RED}Failed to start Redpanda via systemctl${NC}"
        elif command -v rpk &> /dev/null; then
            rpk redpanda start --mode dev-container &
            sleep 2
        else
            echo -e "${RED}Redpanda not found. Install it or set ENABLE_STREAMING_METRICS=false${NC}"
        fi
    else
        echo -e "${GREEN}Redpanda is already running${NC}"
    fi

    # Check if topic exists, create if not
    if command -v rpk &> /dev/null; then
        if ! rpk topic list 2>/dev/null | grep -q "$REDPANDA_TOPIC"; then
            echo -e "${YELLOW}Creating topic: $REDPANDA_TOPIC${NC}"
            rpk topic create "$REDPANDA_TOPIC" 2>/dev/null || echo -e "${RED}Failed to create topic${NC}"
        fi
    fi
fi

# Check if port is available
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${RED}Port $PORT is already in use. Please stop the service using it or change PORT in .env${NC}"
    exit 1
fi

# Build the proxy server
echo -e "${YELLOW}Building proxy server...${NC}"
go build -o proxy-server cmd/main.go

# Start the proxy server
echo -e "${GREEN}Starting proxy server on port $PORT...${NC}"
./proxy-server &
PROXY_PID=$!

echo -e "${GREEN}✓ Proxy M3U8 server started successfully!${NC}"
echo -e "${GREEN}  - Server running on http://localhost:$PORT${NC}"
echo -e "${GREEN}  - PID: $PROXY_PID${NC}"
echo -e "${GREEN}  - Endpoint: http://localhost:$PORT/m3u8-proxy?url=<URL>${NC}"

if [ "$ENABLE_STREAMING_METRICS" = "true" ]; then
    echo -e "${GREEN}  - Metrics streaming to Redpanda topic: $REDPANDA_TOPIC${NC}"
fi

echo ""
echo -e "${YELLOW}To stop the server, run:${NC}"
echo -e "  kill $PROXY_PID"

# Keep script running to show logs
wait $PROXY_PID
