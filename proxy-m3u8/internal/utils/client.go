package utils

import (
	"net/http"
	"time"
)

var ProxyHTTPClient = &http.Client{
	Transport: &http.Transport{
		// Connection pooling - aggressive for high throughput
		MaxIdleConns:          1000,         // Increased from 500
		MaxIdleConnsPerHost:   200,          // Increased from 100
		MaxConnsPerHost:       400,          // Increased from 200
		IdleConnTimeout:       90 * time.Second, // Reduced from 300s

		// Timeouts - tuned for fast streaming
		TLSHandshakeTimeout:   5 * time.Second,  // Reduced from 10s
		ResponseHeaderTimeout: 10 * time.Second, // Reduced from 15s
		ExpectContinueTimeout: 1 * time.Second,

		// Performance optimizations
		DisableKeepAlives:      false,
		DisableCompression:     false, // Let upstream handle compression
		ForceAttemptHTTP2:      true,  // Use HTTP/2 when possible
		WriteBufferSize:        64 << 10, // 64KB (increased from 32KB)
		ReadBufferSize:         64 << 10, // 64KB (increased from 32KB)
	},
	Timeout: 0, // No global timeout - handled per request
}
