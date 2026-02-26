package extensions

import (
	"context"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/rendis/pdf-forge/core/internal/core/port"
)

type localStorageRecord struct {
	asset       port.StorageAsset
	dataURL     string
	workspaceID string
}

// LocalStorageProvider is a minimal local gallery simulation for QA/dev.
// It pre-seeds one image per workspace and serves URLs as data: URIs.
type LocalStorageProvider struct {
	mu          sync.RWMutex
	seeded      map[string]bool
	byWorkspace map[string][]localStorageRecord
	byKey       map[string]localStorageRecord
}

func NewLocalStorageProvider() *LocalStorageProvider {
	return &LocalStorageProvider{
		seeded:      make(map[string]bool),
		byWorkspace: make(map[string][]localStorageRecord),
		byKey:       make(map[string]localStorageRecord),
	}
}

func (p *LocalStorageProvider) List(_ context.Context, req *port.StorageListRequest) (*port.StorageListResult, error) {
	if err := p.ensureSeeded(req.Storage.WorkspaceID); err != nil {
		return nil, err
	}

	p.mu.RLock()
	records := p.byWorkspace[req.Storage.WorkspaceID]
	p.mu.RUnlock()

	page := req.Page
	if page < 1 {
		page = 1
	}
	perPage := req.PerPage
	if perPage < 1 {
		perPage = 20
	}

	start := (page - 1) * perPage
	if start > len(records) {
		start = len(records)
	}
	end := start + perPage
	if end > len(records) {
		end = len(records)
	}

	assets := make([]port.StorageAsset, 0, end-start)
	for _, record := range records[start:end] {
		assets = append(assets, record.asset)
	}

	return &port.StorageListResult{
		Assets:  assets,
		Total:   len(records),
		Page:    page,
		PerPage: perPage,
	}, nil
}

func (p *LocalStorageProvider) Search(_ context.Context, req *port.StorageSearchRequest) (*port.StorageListResult, error) {
	if err := p.ensureSeeded(req.Storage.WorkspaceID); err != nil {
		return nil, err
	}

	p.mu.RLock()
	records := p.byWorkspace[req.Storage.WorkspaceID]
	p.mu.RUnlock()

	query := strings.ToLower(strings.TrimSpace(req.Query))
	filtered := make([]localStorageRecord, 0, len(records))
	for _, record := range records {
		if query == "" ||
			strings.Contains(strings.ToLower(record.asset.Name), query) ||
			strings.Contains(strings.ToLower(record.asset.Key), query) {
			filtered = append(filtered, record)
		}
	}

	page := req.Page
	if page < 1 {
		page = 1
	}
	perPage := req.PerPage
	if perPage < 1 {
		perPage = 20
	}

	start := (page - 1) * perPage
	if start > len(filtered) {
		start = len(filtered)
	}
	end := start + perPage
	if end > len(filtered) {
		end = len(filtered)
	}

	assets := make([]port.StorageAsset, 0, end-start)
	for _, record := range filtered[start:end] {
		assets = append(assets, record.asset)
	}

	return &port.StorageListResult{
		Assets:  assets,
		Total:   len(filtered),
		Page:    page,
		PerPage: perPage,
	}, nil
}

func (p *LocalStorageProvider) InitUpload(_ context.Context, req *port.StorageInitUploadRequest) (*port.StorageInitUploadResult, error) {
	if err := p.ensureSeeded(req.Storage.WorkspaceID); err != nil {
		return nil, err
	}

	if req.SHA256 != "" {
		p.mu.RLock()
		records := p.byWorkspace[req.Storage.WorkspaceID]
		p.mu.RUnlock()
		for _, record := range records {
			if strings.EqualFold(record.asset.SHA256, req.SHA256) {
				asset := record.asset
				return &port.StorageInitUploadResult{
					Duplicate: true,
					Asset:     &asset,
				}, nil
			}
		}
	}

	return nil, errors.New("local gallery simulation is read-only (upload not supported)")
}

func (p *LocalStorageProvider) CompleteUpload(_ context.Context, _ *port.StorageCompleteUploadRequest) (*port.StorageCompleteUploadResult, error) {
	return nil, errors.New("local gallery simulation is read-only (upload not supported)")
}

func (p *LocalStorageProvider) Delete(_ context.Context, req *port.StorageDeleteRequest) error {
	p.mu.Lock()
	defer p.mu.Unlock()

	records := p.byWorkspace[req.Storage.WorkspaceID]
	filtered := make([]localStorageRecord, 0, len(records))
	for _, record := range records {
		if record.asset.Key != req.Key {
			filtered = append(filtered, record)
		}
	}
	p.byWorkspace[req.Storage.WorkspaceID] = filtered
	delete(p.byKey, req.Key)
	return nil
}

func (p *LocalStorageProvider) GetURL(_ context.Context, req *port.StorageGetURLRequest) (*port.StorageGetURLResult, error) {
	if err := p.ensureSeeded(req.Storage.WorkspaceID); err != nil {
		return nil, err
	}

	p.mu.RLock()
	record, ok := p.byKey[req.Key]
	p.mu.RUnlock()
	if !ok {
		return nil, fmt.Errorf("asset not found: %s", req.Key)
	}
	if record.workspaceID != req.Storage.WorkspaceID {
		return nil, fmt.Errorf("asset %s does not belong to workspace %s", req.Key, req.Storage.WorkspaceID)
	}

	return &port.StorageGetURLResult{URL: record.dataURL}, nil
}

func (p *LocalStorageProvider) ensureSeeded(workspaceID string) error {
	if workspaceID == "" {
		return errors.New("workspace id is required for local storage provider")
	}

	p.mu.RLock()
	alreadySeeded := p.seeded[workspaceID]
	p.mu.RUnlock()
	if alreadySeeded {
		return nil
	}

	record, err := loadLocalSeedAsset(workspaceID)
	if err != nil {
		return err
	}

	p.mu.Lock()
	defer p.mu.Unlock()
	if p.seeded[workspaceID] {
		return nil
	}
	p.byWorkspace[workspaceID] = []localStorageRecord{record}
	p.byKey[record.asset.Key] = record
	p.seeded[workspaceID] = true
	return nil
}

func loadLocalSeedAsset(workspaceID string) (localStorageRecord, error) {
	candidates := []string{
		"core/docs/assets/hero-screenshot.png",
		"docs/assets/hero-screenshot.png",
		"core/docs/assets/editor-variables.png",
	}

	var selectedPath string
	for _, path := range candidates {
		if _, err := os.Stat(path); err == nil {
			selectedPath = path
			break
		}
	}

	if selectedPath == "" {
		return localStorageRecord{}, errors.New("no local seed image found")
	}

	data, err := os.ReadFile(selectedPath)
	if err != nil {
		return localStorageRecord{}, err
	}

	contentType := http.DetectContentType(data)
	if !strings.HasPrefix(contentType, "image/") {
		return localStorageRecord{}, fmt.Errorf("seed file is not an image: %s", selectedPath)
	}

	sum := sha256.Sum256(data)
	sha := hex.EncodeToString(sum[:])

	ext := filepath.Ext(selectedPath)
	if ext == "" {
		ext = ".png"
	}

	key := fmt.Sprintf("%s/%s%s", workspaceID, sha, ext)
	dataURL := fmt.Sprintf("data:%s;base64,%s", contentType, base64.StdEncoding.EncodeToString(data))

	asset := port.StorageAsset{
		Key:          key,
		Name:         "local-gallery-seed" + ext,
		ContentType:  contentType,
		Size:         int64(len(data)),
		SHA256:       sha,
		ThumbnailURL: dataURL,
		CreatedAt:    time.Now().UTC(),
	}

	return localStorageRecord{
		asset:       asset,
		dataURL:     dataURL,
		workspaceID: workspaceID,
	}, nil
}
