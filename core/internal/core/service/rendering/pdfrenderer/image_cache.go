package pdfrenderer

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"log/slog"
	"os"
	"path/filepath"
	"sync"
	"time"
)

// ImageCache provides a shared disk-based cache for downloaded images.
// Files are keyed by SHA-256 of the URL and cleaned up periodically by age.
type ImageCache struct {
	dir     string
	maxAge  time.Duration
	mu      sync.RWMutex
	stopCh  chan struct{}
	stopped chan struct{}
}

// ImageCacheOptions configures the image cache.
type ImageCacheOptions struct {
	Dir             string
	MaxAge          time.Duration
	CleanupInterval time.Duration
}

// NewImageCache creates and starts an image cache with periodic cleanup.
// If dir is empty, a temp directory is created.
func NewImageCache(opts ImageCacheOptions) (*ImageCache, error) {
	if opts.Dir == "" {
		dir, err := os.MkdirTemp("", "typst-image-cache-*")
		if err != nil {
			return nil, err
		}
		opts.Dir = dir
	}

	if err := os.MkdirAll(opts.Dir, 0o755); err != nil {
		return nil, err
	}

	if opts.MaxAge <= 0 {
		opts.MaxAge = 5 * time.Minute
	}
	if opts.CleanupInterval <= 0 {
		opts.CleanupInterval = time.Minute
	}

	ic := &ImageCache{
		dir:     opts.Dir,
		maxAge:  opts.MaxAge,
		stopCh:  make(chan struct{}),
		stopped: make(chan struct{}),
	}

	go ic.cleanupLoop(opts.CleanupInterval)
	return ic, nil
}

// cacheKeyForURL returns a hex-encoded SHA-256 hash of the URL.
func cacheKeyForURL(url string) string {
	h := sha256.Sum256([]byte(url))
	return hex.EncodeToString(h[:])
}

// Lookup checks if an image for the given URL exists in cache.
// Returns the file path and true if found, or empty string and false if not.
func (ic *ImageCache) Lookup(url string) (string, bool) {
	ic.mu.RLock()
	defer ic.mu.RUnlock()

	prefix := cacheKeyForURL(url)
	matches, err := filepath.Glob(filepath.Join(ic.dir, prefix+".*"))
	if err != nil || len(matches) == 0 {
		return "", false
	}

	// Touch the file to keep it alive in cache
	now := time.Now()
	_ = os.Chtimes(matches[0], now, now)

	return matches[0], true
}

// Store saves image data to the cache, returning the stored file path.
func (ic *ImageCache) Store(url string, ext string, data []byte) (string, error) {
	ic.mu.Lock()
	defer ic.mu.Unlock()

	filename := cacheKeyForURL(url) + ext
	path := filepath.Join(ic.dir, filename)
	if err := os.WriteFile(path, data, 0o600); err != nil {
		return "", err
	}
	return path, nil
}

// Dir returns the cache directory path for use as Typst --root.
func (ic *ImageCache) Dir() string {
	return ic.dir
}

// cleanupLoop periodically removes files older than maxAge.
func (ic *ImageCache) cleanupLoop(interval time.Duration) {
	defer close(ic.stopped)
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for {
		select {
		case <-ic.stopCh:
			return
		case <-ticker.C:
			ic.cleanup()
		}
	}
}

func (ic *ImageCache) cleanup() {
	ic.mu.Lock()
	defer ic.mu.Unlock()

	cutoff := time.Now().Add(-ic.maxAge)
	entries, err := os.ReadDir(ic.dir)
	if err != nil {
		return
	}

	var removed int
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		info, err := entry.Info()
		if err != nil {
			continue
		}
		if info.ModTime().Before(cutoff) {
			_ = os.Remove(filepath.Join(ic.dir, entry.Name()))
			removed++
		}
	}
	if removed > 0 {
		slog.Info("image cache cleanup",
			slog.Int("removed", removed),
			slog.String("dir", ic.dir),
		)
	}
}

// Close stops the cleanup goroutine.
func (ic *ImageCache) Close() {
	close(ic.stopCh)
	<-ic.stopped
}

// ResolveImages downloads images that aren't cached, stores them, and returns
// a map of typst placeholder filenames to actual filenames in the cache dir.
func (ic *ImageCache) ResolveImages(ctx context.Context, images map[string]string, downloadFn func(ctx context.Context, url, destPath string) (string, error)) map[string]string {
	renames := make(map[string]string)
	for url, typstFilename := range images {
		if cachedName := ic.resolveOne(ctx, url, typstFilename, downloadFn); cachedName != typstFilename {
			renames[typstFilename] = cachedName
		}
	}
	return renames
}

// resolveOne resolves a single image, returning the actual filename in the cache dir.
func (ic *ImageCache) resolveOne(ctx context.Context, url, typstFilename string, downloadFn func(ctx context.Context, url, destPath string) (string, error)) string {
	if cachedPath, found := ic.Lookup(url); found {
		return filepath.Base(cachedPath)
	}

	storedName, err := ic.downloadAndStore(ctx, url, typstFilename, downloadFn)
	if err != nil {
		slog.WarnContext(ctx, "failed to download image, using placeholder",
			slog.String("url", url), slog.Any("error", err),
		)
		return ic.storePlaceholder(url)
	}
	return storedName
}

// downloadAndStore downloads an image and stores it in the cache.
func (ic *ImageCache) downloadAndStore(ctx context.Context, url, typstFilename string, downloadFn func(ctx context.Context, url, destPath string) (string, error)) (string, error) {
	tmpPath := filepath.Join(ic.dir, "tmp_"+typstFilename)
	defer os.Remove(tmpPath)

	actualName, err := downloadFn(ctx, url, tmpPath)
	if err != nil {
		return "", err
	}

	actualPath := filepath.Join(ic.dir, actualName)
	defer os.Remove(actualPath)

	data, err := os.ReadFile(actualPath)
	if err != nil {
		return "", err
	}

	storedPath, err := ic.Store(url, filepath.Ext(actualName), data)
	if err != nil {
		return "", err
	}
	return filepath.Base(storedPath), nil
}

// storePlaceholder stores a 1x1 PNG placeholder and returns its cache filename.
func (ic *ImageCache) storePlaceholder(url string) string {
	_, _ = ic.Store(url, ".png", getPlaceholderPNG())
	return cacheKeyForURL(url) + ".png"
}
