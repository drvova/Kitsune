# Redpanda Integration for Proxy M3U8

This document describes how to set up and use Redpanda for real-time monitoring and analytics of your M3U8 proxy server.

## Overview

Redpanda integration enables:
- Real-time streaming of proxy request metrics
- Performance monitoring and analytics
- Event-driven architecture for scaling
- Fault tolerance and high availability

## Quick Start

### Manual Setup

1. **Install Redpanda:**
   ```bash
   # For Ubuntu/Debian
   curl -1sLf 'https://packages.vectorized.io/nzc4ZYQK3WRGd9sy/redpanda/cfg/setup/bash.sh' | sudo -E bash
   sudo apt-get install redpanda -y
   
   # For other systems, check: https://docs.redpanda.com/docs/get-started/
   ```

2. **Start Redpanda:**
   ```bash
   sudo systemctl start redpanda
   sudo systemctl enable redpanda
   
   # Or run in foreground for testing
   sudo rpk redpanda start --mode dev-container
   ```

3. **Create Topic:**
   ```bash
   rpk topic create proxy-metrics
   ```

## Configuration

Add these environment variables to your `.env` file:

```env
# Redpanda Configuration
REDPANDA_BROKERS=localhost:9092
REDPANDA_TOPIC=proxy-metrics
ENABLE_STREAMING_METRICS=true
```

## Events Streamed

The proxy streams the following events to Redpanda:

- **Request timestamp**
- **Session ID** (for tracking user sessions)
- **Target URL** (proxied URL)
- **Referer** (source referer)
- **Status code** (HTTP response status)
- **Response time** (latency in milliseconds)
- **Content type** (MIME type)
- **Content size** (bytes transferred)
- **User agent** (client browser)
- **Success flag** (request success/failure)

## Monitoring with Redpanda Console

1. **Install Redpanda Console (optional):**
   ```bash
   # Download the latest version
   curl -LO https://github.com/redpanda-data/console/releases/latest/download/console-linux-amd64.zip
   unzip console-linux-amd64.zip
   ./console
   ```

2. **Access Redpanda Console** at `http://localhost:8081`
3. **Connect to Redpanda broker** at `localhost:9092`
4. **Monitor the `proxy-metrics` topic**
5. **View real-time metrics and consumer groups**

Alternatively, use `rpk` for command-line monitoring:
```bash
# Monitor topic
rpk topic consume proxy-metrics

# Check cluster health
rpk cluster health

# List topics
rpk topic list
```

## Consumer Applications

You can build consumer applications to:

- **Real-time Dashboards**: Monitor streaming performance
- **Alerting**: Detect performance degradation
- **Analytics**: Analyze usage patterns
- **Logging**: Centralized logging

### Example Consumer (Python)

```python
from kafka import KafkaConsumer
import json

consumer = KafkaConsumer(
    'proxy-metrics',
    bootstrap_servers='localhost:9092',
    value_deserializer=lambda m: json.loads(m.decode('utf-8'))
)

for message in consumer:
    event = message.value
    print(f"Request to {event['target_url']} took {event['response_time_ms']}ms")
```

## Performance Considerations

- **Throughput**: Redpanda handles 1M+ messages per second
- **Latency**: <10ms message latency
- **Persistence**: Messages retained for 7 days by default
- **Compression**: Enabled by default for efficiency

## Scaling

For high-traffic scenarios:

1. **Scale Redpanda**: Add more brokers to the cluster
   ```bash
   # On additional servers
   sudo apt-get install redpanda -y
   sudo rpk redpanda start --mode dev-container --seeds <first-broker-ip>:9092
   ```

2. **Scale Proxy**: Run multiple proxy instances on different ports
3. **Partitioning**: Use multiple partitions for parallel processing
   ```bash
   rpk topic alter proxy-metrics --partitions 10
   ```
4. **Consumer Groups**: Scale consumers independently

## Troubleshooting

### Common Issues

1. **Connection Issues:**
   - Check Redpanda is running: `rpk cluster health`
   - Verify broker addresses in configuration

2. **Topic Issues:**
   - Create topic if missing: `rpk topic create proxy-metrics`
   - Check topic permissions

3. **Performance Issues:**
   - Monitor resource usage
   - Tune buffer sizes and timeouts
   - Check network connectivity

### Logs

```bash
# View Redpanda logs
sudo journalctl -u redpanda -f

# Or if running in foreground
sudo rpk redpanda start --mode dev-container --log-level debug

# View proxy server logs
./proxy-server
```

### Quick Test

Test your setup with:

```bash
# 1. Start Redpanda
sudo systemctl start redpanda

# 2. Create topic
rpk topic create proxy-metrics

# 3. Start proxy server with metrics
ENABLE_STREAMING_METRICS=true ./proxy-server

# 4. Make a test request
curl "http://localhost:8080/m3u8-proxy?url=https://example.com/test.m3u8" -H "X-Session-ID: test-session"

# 5. Monitor the topic
rpk topic consume proxy-metrics
```