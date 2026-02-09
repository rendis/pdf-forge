package templaterepo

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/rendis/pdf-forge/core/internal/core/entity"
	"github.com/rendis/pdf-forge/core/internal/core/port"
)

// New creates a new template repository.
func New(pool *pgxpool.Pool) port.TemplateRepository {
	return &Repository{pool: pool}
}

// Repository implements port.TemplateRepository using PostgreSQL.
type Repository struct {
	pool *pgxpool.Pool
}

// Create creates a new template.
func (r *Repository) Create(ctx context.Context, template *entity.Template) (string, error) {
	var id string
	err := r.pool.QueryRow(ctx, queryCreate,
		template.WorkspaceID,
		template.FolderID,
		template.DocumentTypeID,
		template.Title,
		template.IsPublicLibrary,
		template.CreatedAt,
	).Scan(&id)
	if err != nil {
		return "", fmt.Errorf("creating template: %w", err)
	}

	return id, nil
}

// FindByID finds a template by ID.
func (r *Repository) FindByID(ctx context.Context, id string) (*entity.Template, error) {
	template := &entity.Template{}
	err := r.pool.QueryRow(ctx, queryFindByID, id).Scan(
		&template.ID,
		&template.WorkspaceID,
		&template.FolderID,
		&template.DocumentTypeID,
		&template.Title,
		&template.IsPublicLibrary,
		&template.CreatedAt,
		&template.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, entity.ErrTemplateNotFound
		}
		return nil, fmt.Errorf("finding template %s: %w", id, err)
	}

	return template, nil
}

// FindByIDWithDetails finds a template by ID with published version, tags, and folder.
func (r *Repository) FindByIDWithDetails(ctx context.Context, id string) (*entity.TemplateWithDetails, error) {
	template, err := r.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	details := &entity.TemplateWithDetails{Template: *template}

	// Load published version with details
	version, err := r.loadPublishedVersion(ctx, id)
	if err == nil && version != nil {
		versionDetails := &entity.TemplateVersionWithDetails{TemplateVersion: *version}
		versionDetails.Injectables, _ = r.loadVersionInjectables(ctx, version.ID)
		details.PublishedVersion = versionDetails
	}

	details.Tags, _ = r.loadTemplateTags(ctx, id)
	if template.FolderID != nil {
		details.Folder = r.loadFolder(ctx, *template.FolderID)
	}

	return details, nil
}

// FindByIDWithAllVersions finds a template by ID with all versions.
func (r *Repository) FindByIDWithAllVersions(ctx context.Context, id string) (*entity.TemplateWithAllVersions, error) {
	template, err := r.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	result := &entity.TemplateWithAllVersions{Template: *template}

	// Load all versions
	result.Versions, err = r.loadAllVersions(ctx, id)
	if err != nil {
		return nil, err
	}

	result.Tags, _ = r.loadTemplateTags(ctx, id)
	if template.FolderID != nil {
		result.Folder = r.loadFolder(ctx, *template.FolderID)
	}
	if template.DocumentTypeID != nil {
		result.DocumentType = r.loadDocumentType(ctx, *template.DocumentTypeID)
	}

	return result, nil
}

// FindByWorkspace lists all templates in a workspace with filters.
func (r *Repository) FindByWorkspace(ctx context.Context, workspaceID string, filters port.TemplateFilters) ([]*entity.TemplateListItem, error) {
	filterQuery, filterArgs := buildTemplateFilters(filters, 2)
	query := queryFindByWorkspaceBase + filterQuery
	args := append([]any{workspaceID}, filterArgs...)

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("querying templates: %w", err)
	}
	defer rows.Close()

	templates, err := scanTemplateListItems(rows)
	if err != nil {
		return nil, err
	}

	if err := r.loadTagsForTemplates(ctx, templates); err != nil {
		return nil, err
	}

	return templates, nil
}

// FindByFolder lists all templates in a folder.
func (r *Repository) FindByFolder(ctx context.Context, folderID string) ([]*entity.TemplateListItem, error) {
	rows, err := r.pool.Query(ctx, queryFindByFolder, folderID)
	if err != nil {
		return nil, fmt.Errorf("querying templates by folder: %w", err)
	}
	defer rows.Close()

	templates, err := scanTemplateListItems(rows)
	if err != nil {
		return nil, err
	}

	// Load tags in batch for all templates
	if err := r.loadTagsForTemplates(ctx, templates); err != nil {
		return nil, err
	}

	return templates, nil
}

// FindPublicLibrary lists all public library templates (that have a published version).
func (r *Repository) FindPublicLibrary(ctx context.Context, workspaceID string) ([]*entity.TemplateListItem, error) {
	rows, err := r.pool.Query(ctx, queryFindPublicLibrary)
	if err != nil {
		return nil, fmt.Errorf("querying public library templates: %w", err)
	}
	defer rows.Close()

	templates, err := scanTemplateListItems(rows)
	if err != nil {
		return nil, err
	}

	// Load tags in batch for all templates
	if err := r.loadTagsForTemplates(ctx, templates); err != nil {
		return nil, err
	}

	return templates, nil
}

// loadPublishedVersion loads the published version for a template.
func (r *Repository) loadPublishedVersion(ctx context.Context, templateID string) (*entity.TemplateVersion, error) {
	version := &entity.TemplateVersion{}
	err := r.pool.QueryRow(ctx, queryPublishedVersion, templateID).Scan(
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
		return nil, err
	}
	return version, nil
}

// loadVersionInjectables loads injectables for a version.
func (r *Repository) loadVersionInjectables(ctx context.Context, versionID string) ([]*entity.VersionInjectableWithDefinition, error) {
	rows, err := r.pool.Query(ctx, queryVersionInjectables, versionID)
	if err != nil {
		return nil, fmt.Errorf("querying version injectables: %w", err)
	}
	defer rows.Close()

	var injectables []*entity.VersionInjectableWithDefinition
	for rows.Next() {
		iwd := &entity.VersionInjectableWithDefinition{
			Definition: &entity.InjectableDefinition{},
		}
		if err := rows.Scan(
			&iwd.ID, &iwd.TemplateVersionID, &iwd.InjectableDefinitionID,
			&iwd.IsRequired, &iwd.DefaultValue, &iwd.CreatedAt,
			&iwd.Definition.ID, &iwd.Definition.WorkspaceID, &iwd.Definition.Key,
			&iwd.Definition.Label, &iwd.Definition.Description, &iwd.Definition.DataType,
			&iwd.Definition.CreatedAt, &iwd.Definition.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scanning version injectable: %w", err)
		}
		injectables = append(injectables, iwd)
	}
	return injectables, rows.Err()
}

// loadTemplateTags loads tags for a template.
func (r *Repository) loadTemplateTags(ctx context.Context, templateID string) ([]*entity.Tag, error) {
	rows, err := r.pool.Query(ctx, queryTemplateTags, templateID)
	if err != nil {
		return nil, fmt.Errorf("querying template tags: %w", err)
	}
	defer rows.Close()

	var tags []*entity.Tag
	for rows.Next() {
		tag := &entity.Tag{}
		if err := rows.Scan(
			&tag.ID, &tag.WorkspaceID, &tag.Name,
			&tag.Color, &tag.CreatedAt, &tag.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scanning template tag: %w", err)
		}
		tags = append(tags, tag)
	}
	return tags, rows.Err()
}

// loadFolder loads a folder by ID.
func (r *Repository) loadFolder(ctx context.Context, folderID string) *entity.Folder {
	folder := &entity.Folder{}
	err := r.pool.QueryRow(ctx, queryFolder, folderID).Scan(
		&folder.ID, &folder.WorkspaceID, &folder.ParentID,
		&folder.Name, &folder.CreatedAt, &folder.UpdatedAt,
	)
	if err != nil {
		return nil
	}
	return folder
}

// loadDocumentType loads a document type by ID.
func (r *Repository) loadDocumentType(ctx context.Context, documentTypeID string) *entity.DocumentType {
	docType := &entity.DocumentType{}
	err := r.pool.QueryRow(ctx, queryDocumentType, documentTypeID).Scan(
		&docType.ID, &docType.TenantID, &docType.Code,
		&docType.Name, &docType.Description,
		&docType.CreatedAt, &docType.UpdatedAt,
	)
	if err != nil {
		return nil
	}
	return docType
}

// loadAllVersions loads all versions for a template.
func (r *Repository) loadAllVersions(ctx context.Context, templateID string) ([]*entity.TemplateVersionWithDetails, error) {
	rows, err := r.pool.Query(ctx, queryAllVersions, templateID)
	if err != nil {
		return nil, fmt.Errorf("querying template versions: %w", err)
	}
	defer rows.Close()

	var versions []*entity.TemplateVersionWithDetails
	for rows.Next() {
		v := &entity.TemplateVersion{}
		if err := rows.Scan(
			&v.ID, &v.TemplateID, &v.VersionNumber, &v.Name, &v.Description,
			&v.ContentStructure, &v.Status, &v.ScheduledPublishAt, &v.ScheduledArchiveAt,
			&v.PublishedAt, &v.ArchivedAt, &v.PublishedBy, &v.ArchivedBy,
			&v.CreatedBy, &v.CreatedAt, &v.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scanning template version: %w", err)
		}
		versions = append(versions, &entity.TemplateVersionWithDetails{TemplateVersion: *v})
	}
	return versions, rows.Err()
}

// buildTemplateFilters builds filter query and args for template listing.
func buildTemplateFilters(filters port.TemplateFilters, startArgPos int) (string, []any) {
	var query string
	var args []any
	argPos := startArgPos

	if filters.RootOnly {
		query += " AND t.folder_id IS NULL"
	} else if filters.FolderID != nil {
		query += fmt.Sprintf(` AND t.folder_id = $%d`, argPos)
		args = append(args, *filters.FolderID)
		argPos++
	}

	if filters.HasPublishedVersion != nil {
		if *filters.HasPublishedVersion {
			query += " AND EXISTS(SELECT 1 FROM content.template_versions WHERE template_id = t.id AND status = 'PUBLISHED')"
		} else {
			query += " AND NOT EXISTS(SELECT 1 FROM content.template_versions WHERE template_id = t.id AND status = 'PUBLISHED')"
		}
	}

	if filters.Search != "" {
		query += fmt.Sprintf(" AND t.title ILIKE $%d", argPos)
		args = append(args, "%"+filters.Search+"%")
		argPos++
	}

	if len(filters.TagIDs) > 0 {
		query += fmt.Sprintf(` AND t.id IN (
			SELECT template_id FROM content.template_tags WHERE tag_id = ANY($%d)
			GROUP BY template_id HAVING COUNT(DISTINCT tag_id) = $%d
		)`, argPos, argPos+1)
		args = append(args, filters.TagIDs, len(filters.TagIDs))
		argPos += 2
	}

	query += " ORDER BY COALESCE(f.path, '') ASC, t.title ASC"

	if filters.Limit > 0 {
		query += fmt.Sprintf(" LIMIT $%d", argPos)
		args = append(args, filters.Limit)
		argPos++
	}

	if filters.Offset > 0 {
		query += fmt.Sprintf(" OFFSET $%d", argPos)
		args = append(args, filters.Offset)
	}

	return query, args
}

// scanTemplateListItems scans template list items from rows.
func scanTemplateListItems(rows pgx.Rows) ([]*entity.TemplateListItem, error) {
	var templates []*entity.TemplateListItem
	for rows.Next() {
		item := &entity.TemplateListItem{}
		if err := rows.Scan(
			&item.ID, &item.WorkspaceID, &item.FolderID,
			&item.DocumentTypeID, &item.DocumentTypeCode,
			&item.Title, &item.IsPublicLibrary, &item.CreatedAt, &item.UpdatedAt,
			&item.HasPublishedVersion, &item.VersionCount,
			&item.ScheduledVersionCount, &item.PublishedVersionNumber,
		); err != nil {
			return nil, fmt.Errorf("scanning template: %w", err)
		}
		templates = append(templates, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterating templates: %w", err)
	}
	return templates, nil
}

// loadTagsForTemplates loads tags for multiple templates in a single batch query.
func (r *Repository) loadTagsForTemplates(ctx context.Context, templates []*entity.TemplateListItem) error {
	if len(templates) == 0 {
		return nil
	}

	// Collect template IDs
	templateIDs := make([]string, len(templates))
	templateMap := make(map[string]*entity.TemplateListItem, len(templates))
	for i, t := range templates {
		templateIDs[i] = t.ID
		templateMap[t.ID] = t
		t.Tags = []*entity.Tag{} // Initialize empty slice
	}

	// Query all tags for these templates in one batch
	rows, err := r.pool.Query(ctx, queryTemplateTagsBatch, templateIDs)
	if err != nil {
		return fmt.Errorf("querying template tags batch: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var templateID string
		tag := &entity.Tag{}
		if err := rows.Scan(
			&templateID,
			&tag.ID,
			&tag.Name,
			&tag.Color,
		); err != nil {
			return fmt.Errorf("scanning template tag: %w", err)
		}

		if template, ok := templateMap[templateID]; ok {
			template.Tags = append(template.Tags, tag)
		}
	}

	if err := rows.Err(); err != nil {
		return fmt.Errorf("iterating template tags: %w", err)
	}

	return nil
}

// Update updates a template.
func (r *Repository) Update(ctx context.Context, template *entity.Template) error {
	result, err := r.pool.Exec(ctx, queryUpdate,
		template.ID,
		template.Title,
		template.FolderID,
		template.DocumentTypeID,
		template.IsPublicLibrary,
		template.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("updating template: %w", err)
	}

	if result.RowsAffected() == 0 {
		return entity.ErrTemplateNotFound
	}

	return nil
}

// Delete deletes a template.
func (r *Repository) Delete(ctx context.Context, id string) error {
	result, err := r.pool.Exec(ctx, queryDelete, id)
	if err != nil {
		return fmt.Errorf("deleting template: %w", err)
	}

	if result.RowsAffected() == 0 {
		return entity.ErrTemplateNotFound
	}

	return nil
}

// ExistsByTitle checks if a template with the given title exists in the workspace.
func (r *Repository) ExistsByTitle(ctx context.Context, workspaceID, title string) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(ctx, queryExistsByTitle, workspaceID, title).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("checking template title existence: %w", err)
	}

	return exists, nil
}

// ExistsByTitleExcluding checks if a template with the given title exists, excluding a specific ID.
func (r *Repository) ExistsByTitleExcluding(ctx context.Context, workspaceID, title, excludeID string) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(ctx, queryExistsByTitleExcluding, workspaceID, title, excludeID).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("checking template title existence: %w", err)
	}

	return exists, nil
}

// CountByFolder returns the number of templates in a folder.
func (r *Repository) CountByFolder(ctx context.Context, folderID string) (int, error) {
	var count int
	err := r.pool.QueryRow(ctx, queryCountByFolder, folderID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("counting templates in folder: %w", err)
	}

	return count, nil
}

// FindByDocumentType finds the template assigned to a document type in a workspace.
func (r *Repository) FindByDocumentType(ctx context.Context, workspaceID, documentTypeID string) (*entity.Template, error) {
	template := &entity.Template{}
	err := r.pool.QueryRow(ctx, queryFindByDocumentType, workspaceID, documentTypeID).Scan(
		&template.ID,
		&template.WorkspaceID,
		&template.FolderID,
		&template.DocumentTypeID,
		&template.Title,
		&template.IsPublicLibrary,
		&template.CreatedAt,
		&template.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil // No template assigned to this type in this workspace
		}
		return nil, fmt.Errorf("finding template by document type: %w", err)
	}

	return template, nil
}

// FindByDocumentTypeCode finds templates by document type code across a tenant.
func (r *Repository) FindByDocumentTypeCode(ctx context.Context, tenantID, documentTypeCode string) ([]*entity.TemplateListItem, error) {
	rows, err := r.pool.Query(ctx, queryFindByDocumentTypeCode, tenantID, documentTypeCode)
	if err != nil {
		return nil, fmt.Errorf("querying templates by document type code: %w", err)
	}
	defer rows.Close()

	templates, err := scanTemplateListItems(rows)
	if err != nil {
		return nil, err
	}

	// Load tags in batch for all templates
	if err := r.loadTagsForTemplates(ctx, templates); err != nil {
		return nil, err
	}

	return templates, nil
}

// UpdateDocumentType updates the document type assignment for a template.
func (r *Repository) UpdateDocumentType(ctx context.Context, templateID string, documentTypeID *string) error {
	result, err := r.pool.Exec(ctx, queryUpdateDocumentType, templateID, documentTypeID)
	if err != nil {
		return fmt.Errorf("updating template document type: %w", err)
	}

	if result.RowsAffected() == 0 {
		return entity.ErrTemplateNotFound
	}

	return nil
}
