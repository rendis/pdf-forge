package template

import (
	"time"

	"github.com/dgraph-io/ristretto/v2"

	"github.com/rendis/pdf-forge/internal/core/entity"
)

// TemplateCache provides an in-memory cache for resolved template versions.
type TemplateCache struct {
	cache *ristretto.Cache[string, *entity.TemplateVersionWithDetails]
	ttl   time.Duration
}

// NewTemplateCache creates a new template cache.
// maxEntries controls the approximate number of items the cache will hold.
// ttl controls how long items remain valid.
func NewTemplateCache(maxEntries int64, ttl time.Duration) (*TemplateCache, error) {
	if maxEntries <= 0 {
		maxEntries = 1000
	}
	if ttl <= 0 {
		ttl = 60 * time.Second
	}

	cache, err := ristretto.NewCache(&ristretto.Config[string, *entity.TemplateVersionWithDetails]{
		NumCounters: maxEntries * 10,
		MaxCost:     maxEntries,
		BufferItems: 64,
	})
	if err != nil {
		return nil, err
	}

	return &TemplateCache{cache: cache, ttl: ttl}, nil
}

// cacheKey builds the lookup key for a template resolution.
func cacheKey(tenantCode, workspaceCode, docTypeCode string) string {
	return tenantCode + ":" + workspaceCode + ":" + docTypeCode
}

// Get retrieves a cached template version, returning nil on miss.
func (c *TemplateCache) Get(tenantCode, workspaceCode, docTypeCode string) *entity.TemplateVersionWithDetails {
	if c == nil {
		return nil
	}
	val, found := c.cache.Get(cacheKey(tenantCode, workspaceCode, docTypeCode))
	if !found {
		return nil
	}
	return val
}

// Set stores a resolved template version in the cache.
func (c *TemplateCache) Set(tenantCode, workspaceCode, docTypeCode string, version *entity.TemplateVersionWithDetails) {
	if c == nil {
		return
	}
	c.cache.SetWithTTL(cacheKey(tenantCode, workspaceCode, docTypeCode), version, 1, c.ttl)
}

// Close releases cache resources.
func (c *TemplateCache) Close() {
	if c == nil {
		return
	}
	c.cache.Close()
}
