//go:build integration

package bootstrap

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"runtime"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/rendis/pdf-forge/core/internal/core/port"
	"github.com/rendis/pdf-forge/core/internal/infra/config"
	"github.com/rendis/pdf-forge/core/internal/testutil/testpostgres"
)

const testWorkspaceID = "00000000-0000-0000-0000-000000000010"

func TestAPISmoke_NoStorageProvider(t *testing.T) {
	ctx := context.Background()
	pg := testpostgres.Run(ctx, t)
	server, _ := newAPISmokeServer(t, ctx, pg, false)

	t.Run("health endpoint responds", func(t *testing.T) {
		resp := mustGet(t, server.URL+"/health")
		defer resp.Body.Close()

		require.Equal(t, http.StatusOK, resp.StatusCode)

		var payload map[string]string
		require.NoError(t, json.NewDecoder(resp.Body).Decode(&payload))
		assert.Equal(t, "healthy", payload["status"])
		assert.Equal(t, "pdf-forge", payload["service"])
	})

	t.Run("ready endpoint responds", func(t *testing.T) {
		resp := mustGet(t, server.URL+"/ready")
		defer resp.Body.Close()

		require.Equal(t, http.StatusOK, resp.StatusCode)

		var payload map[string]string
		require.NoError(t, json.NewDecoder(resp.Body).Decode(&payload))
		assert.Equal(t, "ready", payload["status"])
	})

	t.Run("client config exposes gallery disabled in dummy auth", func(t *testing.T) {
		resp := mustGet(t, server.URL+"/api/v1/config")
		defer resp.Body.Close()

		require.Equal(t, http.StatusOK, resp.StatusCode)

		var payload clientConfigResponse
		require.NoError(t, json.NewDecoder(resp.Body).Decode(&payload))
		assert.True(t, payload.DummyAuth)
		assert.False(t, payload.Features.Gallery)
		assert.Equal(t, "", payload.BasePath)
	})

	t.Run("ping works through authenticated api group", func(t *testing.T) {
		resp := mustGet(t, server.URL+"/api/v1/ping")
		defer resp.Body.Close()

		require.Equal(t, http.StatusOK, resp.StatusCode)

		var payload map[string]string
		require.NoError(t, json.NewDecoder(resp.Body).Decode(&payload))
		assert.Equal(t, "pong", payload["message"])
	})
}

func TestAPISmoke_WithStorageProvider(t *testing.T) {
	ctx := context.Background()
	pg := testpostgres.Run(ctx, t)
	server, storageProvider := newAPISmokeServer(t, ctx, pg, true)

	t.Run("client config exposes gallery enabled", func(t *testing.T) {
		resp := mustGet(t, server.URL+"/api/v1/config")
		defer resp.Body.Close()

		require.Equal(t, http.StatusOK, resp.StatusCode)

		var payload clientConfigResponse
		require.NoError(t, json.NewDecoder(resp.Body).Decode(&payload))
		assert.True(t, payload.Features.Gallery)
	})

	t.Run("gallery route is wired with dummy auth and workspace header", func(t *testing.T) {
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, server.URL+"/api/v1/workspace/gallery", nil)
		require.NoError(t, err)
		req.Header.Set("X-Workspace-ID", testWorkspaceID)

		resp, err := http.DefaultClient.Do(req)
		require.NoError(t, err)
		defer resp.Body.Close()

		require.Equal(t, http.StatusOK, resp.StatusCode)

		var payload struct {
			Assets  []any `json:"assets"`
			Total   int   `json:"total"`
			Page    int   `json:"page"`
			PerPage int   `json:"perPage"`
		}
		require.NoError(t, json.NewDecoder(resp.Body).Decode(&payload))
		assert.Empty(t, payload.Assets)
		assert.Equal(t, 0, payload.Total)
		assert.Equal(t, 1, payload.Page)
		assert.Equal(t, 20, payload.PerPage)

		require.NotNil(t, storageProvider.lastListReq)
		assert.Equal(t, testWorkspaceID, storageProvider.lastListReq.Storage.WorkspaceID)
		assert.Equal(t, 1, storageProvider.lastListReq.Page)
		assert.Equal(t, 20, storageProvider.lastListReq.PerPage)
	})
}

type clientConfigResponse struct {
	DummyAuth bool   `json:"dummyAuth"`
	BasePath  string `json:"basePath"`
	Features  struct {
		Gallery bool `json:"gallery"`
	} `json:"features"`
}

func newAPISmokeServer(t *testing.T, ctx context.Context, pg *testpostgres.Container, withStorage bool) (*httptest.Server, *apiSmokeStorageProvider) {
	t.Helper()

	pg.Restore(ctx, t)
	typstPath := writeTypstStub(t)
	cfg := newIntegrationConfig(pg.Config, typstPath)

	engine := &Engine{config: cfg}
	var storageProvider *apiSmokeStorageProvider
	if withStorage {
		storageProvider = &apiSmokeStorageProvider{}
		engine.SetStorageProvider(storageProvider)
	}

	require.NoError(t, engine.preflightChecks(ctx))

	app, err := engine.initialize(ctx)
	require.NoError(t, err)
	t.Cleanup(app.cleanup)

	server := httptest.NewServer(app.httpServer.Engine())
	t.Cleanup(server.Close)

	return server, storageProvider
}

func newIntegrationConfig(dbCfg config.DatabaseConfig, typstPath string) *config.Config {
	return &config.Config{
		Environment: "test",
		Server: config.ServerConfig{
			Port:            "0",
			ReadTimeout:     30,
			WriteTimeout:    30,
			ShutdownTimeout: 5,
		},
		Database: dbCfg,
		Logging: config.LoggingConfig{
			Level:  "info",
			Format: "json",
		},
		Typst: config.TypstConfig{
			BinPath:               typstPath,
			TimeoutSeconds:        5,
			MaxConcurrent:         1,
			AcquireTimeoutSeconds: 5,
			TemplateCacheTTL:      30,
			TemplateCacheMax:      10,
		},
		Bootstrap: config.BootstrapConfig{
			Enabled: true,
		},
	}
}

func writeTypstStub(t *testing.T) string {
	t.Helper()

	dir := t.TempDir()
	name := "typst"
	content := "#!/bin/sh\nif [ \"$1\" = \"--version\" ]; then\n  echo \"typst 0.0.0-test\"\n  exit 0\nfi\nexit 1\n"
	if runtime.GOOS == "windows" {
		name = "typst.bat"
		content = "@echo off\r\nif \"%1\"==\"--version\" (\r\n  echo typst 0.0.0-test\r\n  exit /b 0\r\n)\r\nexit /b 1\r\n"
	}

	path := filepath.Join(dir, name)
	require.NoError(t, os.WriteFile(path, []byte(content), 0o755))
	return path
}

func mustGet(t *testing.T, url string) *http.Response {
	t.Helper()

	resp, err := http.Get(url) //nolint:noctx // simple smoke GET in tests
	require.NoError(t, err)
	return resp
}

type apiSmokeStorageProvider struct {
	lastListReq *port.StorageListRequest
}

func (p *apiSmokeStorageProvider) List(_ context.Context, req *port.StorageListRequest) (*port.StorageListResult, error) {
	p.lastListReq = req
	return &port.StorageListResult{
		Assets:  []port.StorageAsset{},
		Total:   0,
		Page:    req.Page,
		PerPage: req.PerPage,
	}, nil
}

func (p *apiSmokeStorageProvider) Search(_ context.Context, req *port.StorageSearchRequest) (*port.StorageListResult, error) {
	return &port.StorageListResult{
		Assets:  []port.StorageAsset{},
		Total:   0,
		Page:    req.Page,
		PerPage: req.PerPage,
	}, nil
}

func (p *apiSmokeStorageProvider) InitUpload(context.Context, *port.StorageInitUploadRequest) (*port.StorageInitUploadResult, error) {
	return &port.StorageInitUploadResult{}, nil
}

func (p *apiSmokeStorageProvider) CompleteUpload(context.Context, *port.StorageCompleteUploadRequest) (*port.StorageCompleteUploadResult, error) {
	return &port.StorageCompleteUploadResult{}, nil
}

func (p *apiSmokeStorageProvider) Delete(context.Context, *port.StorageDeleteRequest) error {
	return nil
}

func (p *apiSmokeStorageProvider) GetURL(context.Context, *port.StorageGetURLRequest) (*port.StorageGetURLResult, error) {
	return &port.StorageGetURLResult{URL: "https://example.com/asset.png"}, nil
}
