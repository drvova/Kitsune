package handler

import (
	"net/http"
	"net/url"

	"github.com/dovakiin0/proxy-m3u8/config"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
)

// NextJSProxyHandler creates a reverse proxy handler to forward requests to Next.js
func NextJSProxyHandler() echo.MiddlewareFunc {
	nextjsURL, _ := url.Parse(config.Env.NextJSURL)

	proxyConfig := middleware.ProxyConfig{
		Balancer: middleware.NewRoundRobinBalancer([]*middleware.ProxyTarget{
			{
				URL: nextjsURL,
			},
		}),
		Skipper: func(c echo.Context) bool {
			// Skip proxying for these routes (handle them locally)
			path := c.Path()
			return path == "/m3u8-proxy" || path == "/health"
		},
		ModifyResponse: func(res *http.Response) error {
			// Preserve Next.js response headers
			return nil
		},
	}

	return middleware.ProxyWithConfig(proxyConfig)
}
