package templateversionrepo

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/rendis/pdf-forge/internal/adapters/secondary/database/postgres/common"
	"github.com/rendis/pdf-forge/internal/core/entity"
	"github.com/rendis/pdf-forge/internal/core/port"
)

// New creates a new template version repository.
func New(pool *pgxpool.Pool) port.TemplateVersionRepository {
	return &Repository{pool: pool}
}

// Repository implements port.TemplateVersionRepository using PostgreSQL.
type Repository struct {
	pool *pgxpool.Pool
}

// Create creates a new template version.
func (r *Repository) Create(ctx context.Context, version *entity.TemplateVersion) (string, error) {
	var id string
	err := r.pool.QueryRow(ctx, queryCreate,
		version.TemplateID,
		version.VersionNumber,
		version.Name,
		version.Description,
		version.ContentStructure,
		version.Status,
		version.ScheduledPublishAt,
		version.ScheduledArchiveAt,
		version.CreatedBy,
		version.CreatedAt,
	).Scan(&id)
	if err != nil {
		return "", fmt.Errorf("creating template version: %w", err)
	}

	return id, nil
}

// FindByID finds a template version by ID.
func (r *Repository) FindByID(ctx context.Context, id string) (*entity.TemplateVersion, error) {
	version := &entity.TemplateVersion{}
	err := r.pool.QueryRow(ctx, queryFindByID, id).Scan(
		&version.ID,
		&version.TemplateID,
		&version.VersionNumber,
		&version.Name,
		&version.Description,
		&version.ContentStructure,
		&version.Status,
		&version.ScheduledPublishAt,
		&version.ScheduledArchiveAt,
		&version.PublishedAt,
		&version.ArchivedAt,
		&version.PublishedBy,
		&version.ArchivedBy,
		&version.CreatedBy,
		&version.CreatedAt,
		&version.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, entity.ErrVersionNotFound
		}
		return nil, fmt.Errorf("finding template version %s: %w", id, err)
	}

	return version, nil
}

// FindByIDWithDetails finds a template version by ID with all related data.
func (r *Repository) FindByIDWithDetails(ctx context.Context, id string) (*entity.TemplateVersionWithDetails, error) {
	version, err := r.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	details := &entity.TemplateVersionWithDetails{
		TemplateVersion: *version,
	}

	details.Injectables, err = r.loadInjectablesWithDefinitions(ctx, id)
	if err != nil {
		return nil, err
	}

	return details, nil
}

// loadInjectablesWithDefinitions loads version injectables with their definitions.
// Handles both workspace injectables (with definition) and system injectables (with system_injectable_key).
func (r *Repository) loadInjectablesWithDefinitions(ctx context.Context, versionID string) ([]*entity.VersionInjectableWithDefinition, error) {
	rows, err := r.pool.Query(ctx, queryInjectablesWithDefinitions, versionID)
	if err != nil {
		return nil, fmt.Errorf("querying version injectables: %w", err)
	}
	defer rows.Close()

	var injectables []*entity.VersionInjectableWithDefinition
	for rows.Next() {
		iwd, err := scanVersionInjectable(rows)
		if err != nil {
			return nil, err
		}
		injectables = append(injectables, iwd)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterating version injectables: %w", err)
	}
	return injectables, nil
}

// injectableRow is a scannable interface for rows.
type injectableRow interface {
	Scan(dest ...any) error
}

// scanVersionInjectable scans a single row into a VersionInjectableWithDefinition.
func scanVersionInjectable(row injectableRow) (*entity.VersionInjectableWithDefinition, error) {
	iwd := &entity.VersionInjectableWithDefinition{}
	var defID, defWorkspaceID, defKey, defLabel, defDescription, defDataType *string
	var defCreatedAt, defUpdatedAt *time.Time

	if err := row.Scan(
		&iwd.ID, &iwd.TemplateVersionID, &iwd.InjectableDefinitionID, &iwd.SystemInjectableKey,
		&iwd.IsRequired, &iwd.DefaultValue, &iwd.CreatedAt,
		&defID, &defWorkspaceID, &defKey, &defLabel, &defDescription, &defDataType, &defCreatedAt, &defUpdatedAt,
	); err != nil {
		return nil, fmt.Errorf("scanning version injectable: %w", err)
	}

	if defID != nil {
		iwd.Definition = &entity.InjectableDefinition{
			ID:          *defID,
			WorkspaceID: defWorkspaceID,
			Key:         common.SafeString(defKey),
			Label:       common.SafeString(defLabel),
			Description: common.SafeString(defDescription),
			DataType:    entity.InjectableDataType(common.SafeString(defDataType)),
			CreatedAt:   common.SafeTime(defCreatedAt),
			UpdatedAt:   defUpdatedAt,
		}
	}
	return iwd, nil
}

// FindByTemplateID lists all versions for a template.
func (r *Repository) FindByTemplateID(ctx context.Context, templateID string) ([]*entity.TemplateVersion, error) {
	rows, err := r.pool.Query(ctx, queryFindByTemplateID, templateID)
	if err != nil {
		return nil, fmt.Errorf("querying template versions: %w", err)
	}
	defer rows.Close()

	var versions []*entity.TemplateVersion
	for rows.Next() {
		v := &entity.TemplateVersion{}
		if err := rows.Scan(
			&v.ID,
			&v.TemplateID,
			&v.VersionNumber,
			&v.Name,
			&v.Description,
			&v.ContentStructure,
			&v.Status,
			&v.ScheduledPublishAt,
			&v.ScheduledArchiveAt,
			&v.PublishedAt,
			&v.ArchivedAt,
			&v.PublishedBy,
			&v.ArchivedBy,
			&v.CreatedBy,
			&v.CreatedAt,
			&v.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scanning template version: %w", err)
		}
		versions = append(versions, v)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterating template versions: %w", err)
	}

	return versions, nil
}

// FindByTemplateIDWithDetails lists all versions for a template with full details.
func (r *Repository) FindByTemplateIDWithDetails(ctx context.Context, templateID string) ([]*entity.TemplateVersionWithDetails, error) {
	versions, err := r.FindByTemplateID(ctx, templateID)
	if err != nil {
		return nil, err
	}

	results := make([]*entity.TemplateVersionWithDetails, 0, len(versions))
	for _, v := range versions {
		details, err := r.FindByIDWithDetails(ctx, v.ID)
		if err != nil {
			return nil, err
		}
		results = append(results, details)
	}

	return results, nil
}

// FindPublishedByTemplateID finds the currently published version for a template.
func (r *Repository) FindPublishedByTemplateID(ctx context.Context, templateID string) (*entity.TemplateVersion, error) {
	version := &entity.TemplateVersion{}
	err := r.pool.QueryRow(ctx, queryFindPublishedByTemplateID, templateID).Scan(
		&version.ID,
		&version.TemplateID,
		&version.VersionNumber,
		&version.Name,
		&version.Description,
		&version.ContentStructure,
		&version.Status,
		&version.ScheduledPublishAt,
		&version.ScheduledArchiveAt,
		&version.PublishedAt,
		&version.ArchivedAt,
		&version.PublishedBy,
		&version.ArchivedBy,
		&version.CreatedBy,
		&version.CreatedAt,
		&version.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, entity.ErrNoPublishedVersion
		}
		return nil, fmt.Errorf("finding published version for template %s: %w", templateID, err)
	}

	return version, nil
}

// FindPublishedByTemplateIDWithDetails finds the published version with all details.
func (r *Repository) FindPublishedByTemplateIDWithDetails(ctx context.Context, templateID string) (*entity.TemplateVersionWithDetails, error) {
	version, err := r.FindPublishedByTemplateID(ctx, templateID)
	if err != nil {
		return nil, err
	}

	return r.FindByIDWithDetails(ctx, version.ID)
}

// FindScheduledToPublish finds all versions scheduled to publish before the given time.
func (r *Repository) FindScheduledToPublish(ctx context.Context, before time.Time) ([]*entity.TemplateVersion, error) {
	rows, err := r.pool.Query(ctx, queryFindScheduledToPublish, before)
	if err != nil {
		return nil, fmt.Errorf("querying scheduled versions to publish: %w", err)
	}
	defer rows.Close()

	var versions []*entity.TemplateVersion
	for rows.Next() {
		v := &entity.TemplateVersion{}
		if err := rows.Scan(
			&v.ID,
			&v.TemplateID,
			&v.VersionNumber,
			&v.Name,
			&v.Description,
			&v.ContentStructure,
			&v.Status,
			&v.ScheduledPublishAt,
			&v.ScheduledArchiveAt,
			&v.PublishedAt,
			&v.ArchivedAt,
			&v.PublishedBy,
			&v.ArchivedBy,
			&v.CreatedBy,
			&v.CreatedAt,
			&v.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scanning scheduled version: %w", err)
		}
		versions = append(versions, v)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterating scheduled versions: %w", err)
	}

	return versions, nil
}

// FindScheduledToArchive finds all published versions scheduled to archive before the given time.
func (r *Repository) FindScheduledToArchive(ctx context.Context, before time.Time) ([]*entity.TemplateVersion, error) {
	rows, err := r.pool.Query(ctx, queryFindScheduledToArchive, before)
	if err != nil {
		return nil, fmt.Errorf("querying scheduled versions to archive: %w", err)
	}
	defer rows.Close()

	var versions []*entity.TemplateVersion
	for rows.Next() {
		v := &entity.TemplateVersion{}
		if err := rows.Scan(
			&v.ID,
			&v.TemplateID,
			&v.VersionNumber,
			&v.Name,
			&v.Description,
			&v.ContentStructure,
			&v.Status,
			&v.ScheduledPublishAt,
			&v.ScheduledArchiveAt,
			&v.PublishedAt,
			&v.ArchivedAt,
			&v.PublishedBy,
			&v.ArchivedBy,
			&v.CreatedBy,
			&v.CreatedAt,
			&v.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scanning scheduled archive version: %w", err)
		}
		versions = append(versions, v)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterating scheduled archive versions: %w", err)
	}

	return versions, nil
}

// Update updates a template version.
func (r *Repository) Update(ctx context.Context, version *entity.TemplateVersion) error {
	result, err := r.pool.Exec(ctx, queryUpdate,
		version.ID,
		version.Name,
		version.Description,
		version.ContentStructure,
		version.Status,
		version.ScheduledPublishAt,
		version.ScheduledArchiveAt,
		version.PublishedAt,
		version.ArchivedAt,
		version.PublishedBy,
		version.ArchivedBy,
		version.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("updating template version: %w", err)
	}

	if result.RowsAffected() == 0 {
		return entity.ErrVersionNotFound
	}

	return nil
}

// UpdateStatus updates a version's status with optional user tracking.
func (r *Repository) UpdateStatus(ctx context.Context, id string, status entity.VersionStatus, userID *string) error {
	var query string
	var args []any

	switch status {
	case entity.VersionStatusPublished:
		query = queryUpdateStatusPublished
		args = []any{id, status, userID}
	case entity.VersionStatusArchived:
		query = queryUpdateStatusArchived
		args = []any{id, status, userID}
	default:
		query = queryUpdateStatusDefault
		args = []any{id, status}
	}

	result, err := r.pool.Exec(ctx, query, args...)
	if err != nil {
		return fmt.Errorf("updating version status: %w", err)
	}

	if result.RowsAffected() == 0 {
		return entity.ErrVersionNotFound
	}

	return nil
}

// Delete deletes a template version.
func (r *Repository) Delete(ctx context.Context, id string) error {
	result, err := r.pool.Exec(ctx, queryDelete, id)
	if err != nil {
		return fmt.Errorf("deleting template version: %w", err)
	}

	if result.RowsAffected() == 0 {
		return entity.ErrVersionNotFound
	}

	return nil
}

// ExistsByVersionNumber checks if a version number already exists for the template.
func (r *Repository) ExistsByVersionNumber(ctx context.Context, templateID string, versionNumber int) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(ctx, queryExistsByVersionNumber, templateID, versionNumber).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("checking version number existence: %w", err)
	}

	return exists, nil
}

// ExistsByName checks if a version name already exists for the template.
func (r *Repository) ExistsByName(ctx context.Context, templateID, name string) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(ctx, queryExistsByName, templateID, name).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("checking version name existence: %w", err)
	}

	return exists, nil
}

// ExistsByNameExcluding checks if a version name exists excluding a specific version ID.
func (r *Repository) ExistsByNameExcluding(ctx context.Context, templateID, name, excludeID string) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(ctx, queryExistsByNameExcluding, templateID, name, excludeID).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("checking version name existence: %w", err)
	}

	return exists, nil
}

// GetNextVersionNumber returns the next available version number for a template.
func (r *Repository) GetNextVersionNumber(ctx context.Context, templateID string) (int, error) {
	var nextNum int
	err := r.pool.QueryRow(ctx, queryGetNextVersionNumber, templateID).Scan(&nextNum)
	if err != nil {
		return 0, fmt.Errorf("getting next version number: %w", err)
	}

	return nextNum, nil
}

// HasScheduledVersion checks if the template has a version with SCHEDULED status.
func (r *Repository) HasScheduledVersion(ctx context.Context, templateID string) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(ctx, queryHasScheduledVersion, templateID).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("checking for scheduled version: %w", err)
	}

	return exists, nil
}

// ExistsScheduledAtTime checks if another version is scheduled at the exact time for the template.
func (r *Repository) ExistsScheduledAtTime(ctx context.Context, templateID string, scheduledAt time.Time, excludeVersionID *string) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(ctx, queryExistsScheduledAtTime, templateID, scheduledAt, excludeVersionID).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("checking scheduled time conflict: %w", err)
	}

	return exists, nil
}

// CountByTemplateID returns the number of versions for a template.
func (r *Repository) CountByTemplateID(ctx context.Context, templateID string) (int, error) {
	var count int
	err := r.pool.QueryRow(ctx, queryCountByTemplateID, templateID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("counting template versions: %w", err)
	}

	return count, nil
}
