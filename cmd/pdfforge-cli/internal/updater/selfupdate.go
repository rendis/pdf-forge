package updater

import (
	"context"
	"fmt"
	"runtime"

	"github.com/creativeprojects/go-selfupdate"
)

const (
	// Repository for releases
	GitHubOwner = "rendis"
	GitHubRepo  = "pdf-forge"
)

// CheckResult represents the result of checking for updates
type CheckResult struct {
	CurrentVersion string
	LatestVersion  string
	UpdateURL      string
	HasUpdate      bool
}

// CheckForUpdate checks if a newer version is available
func CheckForUpdate(currentVersion string) (*CheckResult, error) {
	source, err := selfupdate.NewGitHubSource(selfupdate.GitHubConfig{})
	if err != nil {
		return nil, fmt.Errorf("failed to create update source: %w", err)
	}

	updater, err := selfupdate.NewUpdater(selfupdate.Config{
		Source: source,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create updater: %w", err)
	}

	latest, found, err := updater.DetectLatest(context.Background(), selfupdate.NewRepositorySlug(GitHubOwner, GitHubRepo))
	if err != nil {
		return nil, fmt.Errorf("failed to check for updates: %w", err)
	}

	if !found {
		return &CheckResult{
			CurrentVersion: currentVersion,
			HasUpdate:      false,
		}, nil
	}

	hasUpdate := latest.GreaterThan(currentVersion)

	return &CheckResult{
		CurrentVersion: currentVersion,
		LatestVersion:  latest.Version(),
		UpdateURL:      latest.URL,
		HasUpdate:      hasUpdate,
	}, nil
}

// SelfUpdate updates the CLI binary to the latest version
func SelfUpdate(currentVersion string) error {
	source, err := selfupdate.NewGitHubSource(selfupdate.GitHubConfig{})
	if err != nil {
		return fmt.Errorf("failed to create update source: %w", err)
	}

	updater, err := selfupdate.NewUpdater(selfupdate.Config{
		Source: source,
	})
	if err != nil {
		return fmt.Errorf("failed to create updater: %w", err)
	}

	latest, found, err := updater.DetectLatest(context.Background(), selfupdate.NewRepositorySlug(GitHubOwner, GitHubRepo))
	if err != nil {
		return fmt.Errorf("failed to detect latest version: %w", err)
	}

	if !found {
		return fmt.Errorf("no releases found")
	}

	if !latest.GreaterThan(currentVersion) {
		return fmt.Errorf("already at latest version (%s)", currentVersion)
	}

	exe, err := selfupdate.ExecutablePath()
	if err != nil {
		return fmt.Errorf("failed to get executable path: %w", err)
	}

	if err := updater.UpdateTo(context.Background(), latest, exe); err != nil {
		return fmt.Errorf("failed to update: %w", err)
	}

	return nil
}

// GetAssetName returns the expected asset name for the current platform
func GetAssetName() string {
	return fmt.Sprintf("pdfforge-cli_%s_%s", runtime.GOOS, runtime.GOARCH)
}
