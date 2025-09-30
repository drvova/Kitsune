package utils

import (
	"sync"
	"time"
)

// Simple in-memory cache for static segments
type SegmentCache struct {
	cache map[string]*CacheEntry
	mu    sync.RWMutex
}

type CacheEntry struct {
	Data      []byte
	ExpiresAt time.Time
}

var segmentCache = &SegmentCache{
	cache: make(map[string]*CacheEntry),
}

// Get retrieves data from cache if it exists and hasn't expired
func (sc *SegmentCache) Get(key string) ([]byte, bool) {
	sc.mu.RLock()
	defer sc.mu.RUnlock()
	
	if entry, exists := sc.cache[key]; exists {
		if time.Now().Before(entry.ExpiresAt) {
			return entry.Data, true
		}
		// Clean up expired entry
		sc.mu.RUnlock()
		sc.mu.Lock()
		delete(sc.cache, key)
		sc.mu.Unlock()
		sc.mu.RLock()
	}
	
	return nil, false
}

// Set stores data in cache with expiration
func (sc *SegmentCache) Set(key string, data []byte, ttl time.Duration) {
	sc.mu.Lock()
	defer sc.mu.Unlock()
	
	sc.cache[key] = &CacheEntry{
		Data:      data,
		ExpiresAt: time.Now().Add(ttl),
	}
}

// Cleanup removes expired entries
func (sc *SegmentCache) Cleanup() {
	sc.mu.Lock()
	defer sc.mu.Unlock()
	
	for key, entry := range sc.cache {
		if time.Now().After(entry.ExpiresAt) {
			delete(sc.cache, key)
		}
	}
}

// GetSegmentCache returns the singleton segment cache
func GetSegmentCache() *SegmentCache {
	return segmentCache
}

// StartCacheCleanup starts a background cleanup routine
func StartCacheCleanup() {
	go func() {
		ticker := time.NewTicker(5 * time.Minute)
		defer ticker.Stop()
		
		for range ticker.C {
			segmentCache.Cleanup()
		}
	}()
}