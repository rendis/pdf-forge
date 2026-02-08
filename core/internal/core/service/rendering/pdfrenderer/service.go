package pdfrenderer

import (
	"bytes"
	"context"
	"encoding/base64"
	"fmt"
	"image"
	"image/color"
	"image/png"
	"io"
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/rendis/pdf-forge/internal/core/entity"
	"github.com/rendis/pdf-forge/internal/core/port"
)

// Service implements the PDFRenderer interface using Typst.
type Service struct {
	typst          *TypstRenderer
	httpClient     *http.Client
	sem            chan struct{}
	acquireTimeout time.Duration
	imageCache     *ImageCache
}

// NewService creates a new PDF renderer service.
func NewService(opts TypstOptions, imageCache *ImageCache) (*Service, error) {
	typst, err := NewTypstRenderer(opts)
	if err != nil {
		return nil, fmt.Errorf("failed to create typst renderer: %w", err)
	}

	s := &Service{
		typst: typst,
		httpClient: &http.Client{
			Timeout: 15 * time.Second,
		},
		acquireTimeout: opts.AcquireTimeout,
		imageCache:     imageCache,
	}

	if opts.MaxConcurrent > 0 {
		s.sem = make(chan struct{}, opts.MaxConcurrent)
	}
	if s.acquireTimeout == 0 {
		s.acquireTimeout = 5 * time.Second
	}

	return s, nil
}

// RenderPreview generates a preview PDF with injected values.
func (s *Service) RenderPreview(ctx context.Context, req *port.RenderPreviewRequest) (*port.RenderPreviewResult, error) {
	if err := s.acquireSlot(ctx); err != nil {
		return nil, err
	}
	defer s.releaseSlot()

	if req.Document == nil {
		return nil, fmt.Errorf("document is required")
	}

	injectableDefaults := req.InjectableDefaults
	if injectableDefaults == nil {
		injectableDefaults = make(map[string]string)
	}

	builder := NewTypstBuilder(req.Injectables, injectableDefaults)
	typstSource := builder.Build(req.Document)
	pageCount := builder.GetPageCount()

	// Resolve remote images
	remoteImages := builder.RemoteImages()
	rootDir, renames, cleanup, err := s.resolveRemoteImages(ctx, remoteImages)
	if err != nil {
		return nil, err
	}
	if cleanup != nil {
		defer cleanup()
	}
	for oldName, newName := range renames {
		typstSource = strings.ReplaceAll(typstSource, oldName, newName)
	}

	pdfBytes, err := s.typst.GeneratePDF(ctx, typstSource, rootDir)
	if err != nil {
		return nil, fmt.Errorf("failed to generate PDF: %w", err)
	}

	filename := s.generateFilename(req.Document.Meta.Title)

	return &port.RenderPreviewResult{
		PDF:       pdfBytes,
		Filename:  filename,
		PageCount: pageCount,
	}, nil
}

// resolveRemoteImages handles image resolution via cache or direct download.
// Returns rootDir, renames map, optional cleanup func, and error.
func (s *Service) resolveRemoteImages(ctx context.Context, images map[string]string) (string, map[string]string, func(), error) {
	if len(images) == 0 {
		return "", nil, nil, nil
	}

	if s.imageCache != nil {
		renames := s.imageCache.ResolveImages(ctx, images, s.downloadFile)
		return s.imageCache.Dir(), renames, nil, nil
	}

	tmpDir, err := os.MkdirTemp("", "typst-images-*")
	if err != nil {
		return "", nil, nil, fmt.Errorf("failed to create temp dir: %w", err)
	}

	renames, dlErr := s.downloadImages(ctx, images, tmpDir)
	if dlErr != nil {
		slog.WarnContext(ctx, "some images failed to download", slog.Any("error", dlErr))
	}

	return tmpDir, renames, func() { os.RemoveAll(tmpDir) }, nil
}

// downloadImages downloads remote images to the given directory.
// Returns a map of old filename → new filename for cases where the extension was corrected.
// For failed downloads, creates a 1x1 PNG placeholder so Typst doesn't crash.
func (s *Service) downloadImages(ctx context.Context, images map[string]string, dir string) (map[string]string, error) {
	renames := make(map[string]string)
	var lastErr error
	for url, filename := range images {
		dest := filepath.Join(dir, filename)
		actualName, err := s.downloadFile(ctx, url, dest)
		if err != nil {
			slog.WarnContext(ctx, "failed to download image, using placeholder",
				slog.String("url", url),
				slog.Any("error", err),
			)
			lastErr = err
			// Use .png for placeholder since it's a real PNG
			placeholderName := strings.TrimSuffix(filename, filepath.Ext(filename)) + ".png"
			placeholderDest := filepath.Join(dir, placeholderName)
			_ = os.WriteFile(placeholderDest, getPlaceholderPNG(), 0o600)
			if placeholderName != filename {
				renames[filename] = placeholderName
			}
			continue
		}
		if actualName != filename {
			renames[filename] = actualName
		}
	}
	return renames, lastErr
}

var (
	placeholderPNG     []byte
	placeholderPNGOnce sync.Once
)

// getPlaceholderPNG returns a valid 1x1 light gray PNG image.
func getPlaceholderPNG() []byte {
	placeholderPNGOnce.Do(func() {
		img := image.NewRGBA(image.Rect(0, 0, 1, 1))
		img.Set(0, 0, color.RGBA{R: 220, G: 220, B: 220, A: 255})
		var buf bytes.Buffer
		_ = png.Encode(&buf, img)
		placeholderPNG = buf.Bytes()
	})
	return placeholderPNG
}

// downloadFile downloads a URL to a local file with the correct extension based on content type.
// Also handles data: URLs by decoding base64 content directly.
// Returns the actual filename (basename) used, which may differ from destPath's basename if the
// extension was corrected to match the real image type.
func (s *Service) downloadFile(ctx context.Context, url, destPath string) (string, error) {
	if strings.HasPrefix(url, "data:") {
		return s.writeDataURL(url, destPath)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return "", fmt.Errorf("creating request: %w", err)
	}

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("downloading %s: %w", url, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("downloading %s: status %d", url, resp.StatusCode)
	}

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("reading response: %w", err)
	}

	// Detect real image type from magic bytes
	realExt := detectImageExt(data)
	if realExt == "" {
		slog.WarnContext(ctx, "downloaded content is not a valid image",
			slog.String("url", url),
			slog.Int("size", len(data)),
		)
		return "", fmt.Errorf("not a valid image: %s", url)
	}

	// Fix extension to match actual content
	base := strings.TrimSuffix(filepath.Base(destPath), filepath.Ext(destPath))
	actualName := base + realExt
	actualPath := filepath.Join(filepath.Dir(destPath), actualName)

	if err := os.WriteFile(actualPath, data, 0o600); err != nil {
		return "", fmt.Errorf("writing file: %w", err)
	}
	return actualName, nil
}

// writeDataURL decodes a base64 data URL and writes the image to disk.
func (s *Service) writeDataURL(dataURL, destPath string) (string, error) {
	commaIdx := strings.Index(dataURL, ",")
	if commaIdx < 0 {
		return "", fmt.Errorf("invalid data URL: missing comma separator")
	}

	data, err := base64.StdEncoding.DecodeString(dataURL[commaIdx+1:])
	if err != nil {
		return "", fmt.Errorf("decoding base64 data URL: %w", err)
	}

	realExt := detectImageExt(data)
	if realExt == "" {
		return "", fmt.Errorf("data URL does not contain a valid image")
	}

	base := strings.TrimSuffix(filepath.Base(destPath), filepath.Ext(destPath))
	actualName := base + realExt
	actualPath := filepath.Join(filepath.Dir(destPath), actualName)

	if err := os.WriteFile(actualPath, data, 0o600); err != nil {
		return "", fmt.Errorf("writing data URL file: %w", err)
	}
	return actualName, nil
}

// detectImageExt returns the file extension for the detected image type, or "" if not a valid image.
func detectImageExt(data []byte) string {
	if len(data) < 4 {
		return ""
	}
	switch {
	case bytes.HasPrefix(data, []byte{0x89, 0x50, 0x4E, 0x47}):
		return ".png"
	case bytes.HasPrefix(data, []byte{0xFF, 0xD8, 0xFF}):
		return ".jpg"
	case bytes.HasPrefix(data, []byte("GIF8")):
		return ".gif"
	case len(data) >= 12 && string(data[0:4]) == "RIFF" && string(data[8:12]) == "WEBP":
		return ".webp"
	case isSVG(data):
		return ".svg"
	default:
		return ""
	}
}

// isSVG checks if data looks like an SVG by searching for "<svg" in the first 256 bytes.
func isSVG(data []byte) bool {
	limit := len(data)
	if limit > 256 {
		limit = 256
	}
	return bytes.Contains(bytes.ToLower(data[:limit]), []byte("<svg"))
}

// generateFilename creates a safe filename from the document title.
func (s *Service) generateFilename(title string) string {
	if title == "" {
		return "document.pdf"
	}

	safe := make([]rune, 0, len(title))
	for _, r := range title {
		if (r >= 'a' && r <= 'z') ||
			(r >= 'A' && r <= 'Z') ||
			(r >= '0' && r <= '9') ||
			r == '-' || r == '_' || r == ' ' {
			safe = append(safe, r)
		}
	}

	filename := string(safe)
	if filename == "" {
		filename = "document"
	}

	return filename + ".pdf"
}

// acquireSlot blocks until a render slot is available or the timeout expires.
func (s *Service) acquireSlot(ctx context.Context) error {
	if s.sem == nil {
		return nil
	}
	timer := time.NewTimer(s.acquireTimeout)
	defer timer.Stop()
	select {
	case s.sem <- struct{}{}:
		return nil
	case <-ctx.Done():
		return ctx.Err()
	case <-timer.C:
		return entity.ErrRendererBusy
	}
}

// releaseSlot returns a render slot to the pool.
func (s *Service) releaseSlot() {
	if s.sem == nil {
		return
	}
	<-s.sem
}

// Close releases resources held by the service.
func (s *Service) Close() error {
	if s.typst != nil {
		return s.typst.Close()
	}
	return nil
}

// Ensure Service implements port.PDFRenderer
var _ port.PDFRenderer = (*Service)(nil)
