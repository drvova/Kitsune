package handler

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os/exec"
	"strings"
	"time"

	"github.com/dovakiin0/proxy-m3u8/config"
	"github.com/dovakiin0/proxy-m3u8/internal/streaming"
	"github.com/dovakiin0/proxy-m3u8/internal/video"
	"github.com/dovakiin0/proxy-m3u8/internal/utils"
	"github.com/labstack/echo/v4"
)

// Global streaming metrics client
var streamingMetrics *streaming.StreamingMetrics

func init() {
	if config.Env.EnableStreamingMetrics {
		var err error
		streamingMetrics, err = streaming.NewStreamingMetrics(
			config.Env.RedpandaBrokers,
			config.Env.RedpandaTopic,
		)
		if err != nil {
			log.Printf("Failed to initialize streaming metrics: %v", err)
			streamingMetrics = nil
		}
	}
}

func M3U8ProxyHandler(c echo.Context) error {
	startTime := time.Now()

	/*
		########################################################################################
		#              Get the target URL and referer from query parameters
		########################################################################################
	*/
	targetURL := c.QueryParam("url")
	if targetURL == "" {
		return c.String(http.StatusBadRequest, "Missing 'url' query parameter")
	}

	referer := c.QueryParam("referer")
	var refererHeader string
	if referer != "" {
		unscaped, err := url.QueryUnescape(referer)
		if err != nil {
			log.Printf("Error unescaping referer: %v", err)
			return c.String(http.StatusBadRequest, "Invalid 'referer' query parameter")
		}
		refererHeader = unscaped
	}

	
	_, err := url.ParseRequestURI(targetURL)
	if err != nil {
		log.Printf("Invalid target URL: %s, error: %v", targetURL, err)
		return c.String(http.StatusBadRequest, "Invalid 'url' query parameter")
	}
	isM3U8 := strings.HasSuffix(strings.ToLower(targetURL), ".m3u8")
	isTS := strings.HasSuffix(strings.ToLower(targetURL), ".ts")
	isOtherStatic := utils.IsStaticFileExtension(targetURL)

	// Video segments are often disguised with other extensions (.jpg, .html, .js, .css)
	// Treat them as TS segments (but skip enhancement - it's too slow)
	if !isTS && isOtherStatic {
		isTS = true
	}

	req, err := http.NewRequest("GET", targetURL, nil)
	if err != nil {
		log.Printf("Error creating request to target %s: %v", targetURL, err)
		return c.String(http.StatusInternalServerError, "Failed to create request to target server")
	}

	// Set request timeout for streaming
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()
	req = req.WithContext(ctx)

	// Generate dynamic headers with session consistency
	sessionID := c.Request().Header.Get("X-Session-ID")
	if sessionID == "" {
		sessionID = c.QueryParam("session")
	}
	
	dynamicHeaders := utils.GenerateDynamicHeaders(refererHeader, sessionID)
	for key, value := range dynamicHeaders {
		req.Header.Set(key, value)
	}

	upstreamResp, err := utils.ProxyHTTPClient.Do(req)
	if err != nil {
		log.Printf("Error fetching target URL %s: %v", targetURL, err)
		logProxyEvent(c, targetURL, refererHeader, startTime, 0, 0, false)
		// Check for timeout or other specific errors if needed
		if urlErr, ok := err.(*url.Error); ok && urlErr.Timeout() {
			return c.String(http.StatusGatewayTimeout, "Upstream server timed out")
		}
		return c.String(http.StatusBadGateway, "Failed to fetch content from upstream server")
	}
	defer upstreamResp.Body.Close()

	responseHeadersToClient := http.Header{}

	// Whitelist headers to copy
	headerWhitelist := []string{
		"Content-Type", "Content-Disposition", "Accept-Ranges", "Content-Range",
	}
	if upstreamResp.StatusCode == http.StatusOK || upstreamResp.StatusCode == http.StatusPartialContent {
		headerWhitelist = append(headerWhitelist, "ETag", "Last-Modified")
	}

	for _, hName := range headerWhitelist {
		if hVal := upstreamResp.Header.Get(hName); hVal != "" {
			responseHeadersToClient.Set(hName, hVal)
		}
	}

	// Fast path for TS segments - stream directly without buffering
	if isTS && upstreamResp.StatusCode == http.StatusOK {
		// CRITICAL: Skip video enhancement for TS segments - massive performance overhead
		// Enhancement adds 500-2000ms latency via ffmpeg processing
		// Stream directly from upstream to client for <50ms latency

		// Set streaming headers
		c.Response().Header().Set("Connection", "keep-alive")
		c.Response().Header().Set("Keep-Alive", "timeout=5, max=1000")

		// Copy whitelisted headers
		for key, values := range responseHeadersToClient {
			for _, value := range values {
				c.Response().Header().Set(key, value)
			}
		}

		c.Response().WriteHeader(upstreamResp.StatusCode)

		// Stream directly with optimized buffer - NO intermediate buffering
		written, err := io.CopyBuffer(c.Response().Writer, upstreamResp.Body, make([]byte, 64<<10)) // 64KB buffer

		if err != nil {
			log.Printf("Error streaming TS segment to client: %v", err)
			logProxyEvent(c, targetURL, refererHeader, startTime, upstreamResp.StatusCode, 0, false)
		} else {
			logProxyEvent(c, targetURL, refererHeader, startTime, upstreamResp.StatusCode, written, true)
		}

		return nil
	}

	// M3U8 and other files - buffer and transform
	rawBodyBytes, err := io.ReadAll(upstreamResp.Body)
	if err != nil {
		log.Printf("Error reading response body from upstream %s: %v", targetURL, err)
		logProxyEvent(c, targetURL, refererHeader, startTime, 0, 0, false)
		return c.String(http.StatusInternalServerError, "Failed to read response from upstream server")
	}

	var responseBodyBytes []byte

	if isM3U8 && upstreamResp.StatusCode == http.StatusOK {
		var transformedBodyBuffer bytes.Buffer

		// Build the full proxy URL prefix
		scheme := "http"
		if c.Request().TLS != nil {
			scheme = "https"
		}
		host := c.Request().Host
		proxyRoutePath := c.Path()

		// Construct full URL with referer preserved
		urlPrefix := scheme + "://" + host + proxyRoutePath + "?url="
		if referer != "" {
			urlPrefix += "{URL}&referer=" + url.QueryEscape(referer)
		} else {
			urlPrefix += "{URL}"
		}

		err = utils.ProcessM3U8Stream(bytes.NewReader(rawBodyBytes), &transformedBodyBuffer, targetURL, urlPrefix)
		if err != nil {
			log.Printf("Error processing M3U8 stream for %s: %v", targetURL, err)
			return c.String(http.StatusInternalServerError, "Error transforming M3U8 content")
		}
		responseBodyBytes = transformedBodyBuffer.Bytes()
	} else {
		// No transformation or non-OK status
		responseBodyBytes = rawBodyBytes
		// Set Content-Length from upstream if present
		if upstreamResp.Header.Get("Content-Length") != "" {
			responseHeadersToClient.Set("Content-Length", upstreamResp.Header.Get("Content-Length"))
		}
	}

	// Set headers
	for key, values := range responseHeadersToClient {
		for _, value := range values {
			c.Response().Header().Set(key, value)
		}
	}

	c.Response().WriteHeader(upstreamResp.StatusCode)

	// Write response
	_, err = io.Copy(c.Response().Writer, bytes.NewReader(responseBodyBytes))
	if err != nil {
		log.Printf("Error writing response body to client for %s: %v", targetURL, err)
		logProxyEvent(c, targetURL, refererHeader, startTime, 0, 0, false)
	} else {
		contentSize := int64(len(responseBodyBytes))
		logProxyEvent(c, targetURL, refererHeader, startTime, upstreamResp.StatusCode, contentSize, true)
	}

	return nil
}

// applyVideoEnhancements applies video enhancement processing to TS segments using ffmpeg
func applyVideoEnhancements(data []byte, options *video.EnhancementOptions) ([]byte, error) {
	log.Printf("Video enhancement requested - profile: %s, upscale: %dx, sharpen: %.2f, hdr: %v",
		options.Profile, options.UpscaleFactor, options.Sharpen, options.HDRSimulation)

	// Build ffmpeg filter string
	filters := buildFFmpegFilters(options)

	if filters == "" {
		// No enhancement needed, return original
		return data, nil
	}

	// Use ffmpeg to process the video segment
	cmd := exec.Command("ffmpeg",
		"-i", "pipe:0",           // Input from stdin
		"-vf", filters,            // Apply video filters
		"-c:v", "libx264",         // Re-encode with h264
		"-preset", "ultrafast",    // Fast encoding
		"-crf", "23",              // Quality (lower = better, 18-28 is good)
		"-c:a", "copy",            // Copy audio without re-encoding
		"-f", "mpegts",            // Output format: MPEG-TS
		"-y",                      // Overwrite output
		"pipe:1",                  // Output to stdout
	)

	// Set up pipes
	cmd.Stdin = bytes.NewReader(data)
	var outBuf bytes.Buffer
	var errBuf bytes.Buffer
	cmd.Stdout = &outBuf
	cmd.Stderr = &errBuf

	// Run ffmpeg
	err := cmd.Run()
	if err != nil {
		log.Printf("ffmpeg error: %v, stderr: %s", err, errBuf.String())
		// Return original data if enhancement fails
		return data, nil
	}

	log.Printf("Video enhanced successfully, original: %d bytes, enhanced: %d bytes", len(data), outBuf.Len())
	return outBuf.Bytes(), nil
}

// buildFFmpegFilters creates an ffmpeg filter string based on enhancement options
func buildFFmpegFilters(options *video.EnhancementOptions) string {
	var filters []string

	// Apply sharpening
	if options.Sharpen > 0 {
		// unsharp filter: luma_msize:luma_amount
		amount := options.Sharpen * 2.0 // Scale 0-1 to 0-2
		filters = append(filters, fmt.Sprintf("unsharp=5:5:%.2f:5:5:0", amount))
	}

	// Apply color enhancement based on profile
	if options.ColorProfile != nil {
		if options.ColorProfile.Saturation != 1.0 {
			filters = append(filters, fmt.Sprintf("eq=saturation=%.2f", options.ColorProfile.Saturation))
		}
		if options.ColorProfile.Contrast != 0.0 {
			// Convert -1 to 1 range to ffmpeg's -2 to 2 range
			contrast := 1.0 + options.ColorProfile.Contrast
			filters = append(filters, fmt.Sprintf("eq=contrast=%.2f", contrast))
		}
		if options.ColorProfile.Brightness != 0.0 {
			filters = append(filters, fmt.Sprintf("eq=brightness=%.2f", options.ColorProfile.Brightness))
		}
		if options.ColorProfile.Gamma != 1.0 {
			filters = append(filters, fmt.Sprintf("eq=gamma=%.2f", options.ColorProfile.Gamma))
		}
	}

	// Apply upscaling
	if options.UpscaleFactor == 2 {
		filters = append(filters, "scale=iw*2:ih*2:flags=lanczos")
	} else if options.UpscaleFactor == 4 {
		filters = append(filters, "scale=iw*4:ih*4:flags=lanczos")
	}

	// Apply HDR simulation (simple tone mapping)
	if options.HDRSimulation {
		filters = append(filters, "eq=gamma=1.2:contrast=1.1")
	}

	// Join all filters with comma
	if len(filters) == 0 {
		return ""
	}

	result := ""
	for i, f := range filters {
		if i > 0 {
			result += ","
		}
		result += f
	}
	return result
}

// logProxyEvent logs proxy events to Redpanda if enabled
func logProxyEvent(c echo.Context, targetURL, referer string, startTime time.Time, statusCode int, contentSize int64, success bool) {
	if streamingMetrics == nil || !streamingMetrics.IsEnabled() {
		return
	}

	sessionID := c.Request().Header.Get("X-Session-ID")
	if sessionID == "" {
		sessionID = c.QueryParam("session")
	}
	if sessionID == "" {
		sessionID = "anonymous"
	}

	event := &streaming.ProxyRequestEvent{
		Timestamp:    startTime,
		SessionID:    sessionID,
		TargetURL:    targetURL,
		Referer:      referer,
		StatusCode:   statusCode,
		ResponseTime: time.Since(startTime).Milliseconds(),
		ContentType:  c.Response().Header().Get("Content-Type"),
		ContentSize:  contentSize,
		UserAgent:    c.Request().UserAgent(),
		Success:      success,
	}

	if err := streamingMetrics.LogProxyRequest(event); err != nil {
		log.Printf("Failed to log proxy event: %v", err)
	}
}
