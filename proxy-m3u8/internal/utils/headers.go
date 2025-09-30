package utils

import (
	"math/rand"
	"time"
)

// User-Agent pool for rotation
var userAgents = []string{
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0",
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:119.0) Gecko/20100101 Firefox/119.0",
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:120.0) Gecko/20100101 Firefox/120.0",
	"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Safari/537.36",
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15",
}

// Session store for consistent headers
var sessionStore = make(map[string]string)

func init() {
	rand.Seed(time.Now().UnixNano())
}

// GetRandomUserAgent returns a random User-Agent from the pool
func GetRandomUserAgent() string {
	return userAgents[rand.Intn(len(userAgents))]
}

// GetSessionUserAgent returns a consistent User-Agent for a session
func GetSessionUserAgent(sessionID string) string {
	if ua, exists := sessionStore[sessionID]; exists {
		return ua
	}
	
	ua := GetRandomUserAgent()
	sessionStore[sessionID] = ua
	return ua
}

// GenerateDynamicHeaders returns headers for the proxy request
func GenerateDynamicHeaders(referer, sessionID string) map[string]string {
	headers := make(map[string]string)
	
	// User-Agent (session consistent if sessionID provided)
	var userAgent string
	if sessionID != "" {
		userAgent = GetSessionUserAgent(sessionID)
	} else {
		userAgent = GetRandomUserAgent()
	}
	headers["User-Agent"] = userAgent
	
	// Accept headers for video streaming
	headers["Accept"] = "*/*"
	headers["Accept-Language"] = "en-US,en;q=0.9"
	headers["Accept-Encoding"] = "gzip, deflate, br"
	
	// Referer and Origin
	if referer != "" {
		headers["Referer"] = referer
		headers["Origin"] = referer
	} else {
		// Default referer for streaming sites
		headers["Referer"] = "https://megaplay.buzz/"
		headers["Origin"] = "https://megaplay.buzz/"
	}
	
	// Additional headers to look more like a real browser
	headers["DNT"] = "1"
	headers["Connection"] = "keep-alive"
	headers["Upgrade-Insecure-Requests"] = "1"
	
	return headers
}

// Cleanup old sessions (optional, for memory management)
func CleanupOldSessions() {
	// This could be called periodically to clean up old sessions
	// For now, we'll keep it simple
}