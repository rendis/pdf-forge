package template

import (
	"context"
	"encoding/json"
	"time"

	"github.com/rendis/pdf-forge/internal/core/entity"
)

// CreateVersionCommand represents the command to create a new template version.
type CreateVersionCommand struct {
	TemplateID  string
	Name        string
	Description *string
	CreatedBy   *string
}

// UpdateVersionCommand represents the command to update a template version.
type UpdateVersionCommand struct {
	ID               string
	Name             *string
	Description      *string
	ContentStructure json.RawMessage
}

// AddVersionInjectableCommand represents the command to add an injectable to a version.
type AddVersionInjectableCommand struct {
	VersionID              string
	InjectableDefinitionID string
	IsRequired             bool
	DefaultValue           *string
}

// SchedulePublishCommand represents the command to schedule version publication.
type SchedulePublishCommand struct {
	VersionID string
	PublishAt time.Time
}

// ScheduleArchiveCommand represents the command to schedule version archival.
type ScheduleArchiveCommand struct {
	VersionID string
	ArchiveAt time.Time
}

// TemplateVersionUseCase defines the input port for template version operations.
type TemplateVersionUseCase interface {
	// CreateVersion creates a new version for a template.
	CreateVersion(ctx context.Context, cmd CreateVersionCommand) (*entity.TemplateVersion, error)

	// CreateVersionFromExisting creates a new version copying content from an existing version.
	CreateVersionFromExisting(ctx context.Context, sourceVersionID string, name string, description *string, createdBy *string) (*entity.TemplateVersion, error)

	// GetVersion retrieves a template version by ID.
	GetVersion(ctx context.Context, id string) (*entity.TemplateVersion, error)

	// GetVersionWithDetails retrieves a version with all related data.
	GetVersionWithDetails(ctx context.Context, id string) (*entity.TemplateVersionWithDetails, error)

	// ListVersions lists all versions for a template.
	ListVersions(ctx context.Context, templateID string) ([]*entity.TemplateVersion, error)

	// GetPublishedVersion gets the currently published version for a template.
	GetPublishedVersion(ctx context.Context, templateID string) (*entity.TemplateVersionWithDetails, error)

	// UpdateVersion updates a template version.
	UpdateVersion(ctx context.Context, cmd UpdateVersionCommand) (*entity.TemplateVersion, error)

	// PublishVersion publishes a version (archives current published if exists).
	PublishVersion(ctx context.Context, id string, userID string) error

	// SchedulePublish schedules a version for future publication.
	SchedulePublish(ctx context.Context, cmd SchedulePublishCommand) error

	// ScheduleArchive schedules the current published version for future archival.
	ScheduleArchive(ctx context.Context, cmd ScheduleArchiveCommand) error

	// CancelSchedule cancels any scheduled publication or archival.
	CancelSchedule(ctx context.Context, versionID string) error

	// ArchiveVersion manually archives a published version.
	ArchiveVersion(ctx context.Context, id string, userID string) error

	// DeleteVersion deletes a draft version.
	DeleteVersion(ctx context.Context, id string) error

	// AddInjectable adds an injectable to a version.
	AddInjectable(ctx context.Context, cmd AddVersionInjectableCommand) (*entity.TemplateVersionInjectable, error)

	// RemoveInjectable removes an injectable from a version.
	RemoveInjectable(ctx context.Context, id string) error

	// ProcessScheduledPublications publishes all versions whose scheduled time has passed.
	ProcessScheduledPublications(ctx context.Context) error

	// ProcessScheduledArchivals archives all published versions whose scheduled archive time has passed.
	ProcessScheduledArchivals(ctx context.Context) error
}
